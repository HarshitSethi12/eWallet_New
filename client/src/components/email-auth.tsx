import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { deriveMultiChainWallet, generateSalt, validatePassword } from '@/lib/self-custodial-wallet';
import { Eye, EyeOff, Copy, Check, AlertTriangle, Wallet } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface EmailAuthProps {
  onSuccess: () => void;
  isLoginMode: boolean;
}

export function EmailAuth({ onSuccess, isLoginMode }: EmailAuthProps) {
  const [step, setStep] = useState<'email' | 'password' | 'recovery-phrase' | 'confirmation'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletExists, setWalletExists] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [btcAddress, setBtcAddress] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [solAddress, setSolAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { toast } = useToast();

  const checkWalletExists = async (emailToCheck: string) => {
    if (!emailToCheck || !/\S+@\S+\.\S+/.test(emailToCheck)) {
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch('/auth/email-wallet/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck.toLowerCase().trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setWalletExists(data.exists || false);
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address'
      });
      return;
    }
    
    // Check if wallet already exists for this email
    await checkWalletExists(email);
    
    // For create mode, check if wallet already exists
    if (!isLoginMode && walletExists) {
      toast({
        variant: 'destructive',
        title: 'Wallet already exists',
        description: 'You already have a wallet for this email. Please log in instead.'
      });
      return;
    }
    
    setStep('password');
  };

  const handleCreateWallet = async () => {
    // Validate email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address'
      });
      return;
    }

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Password requirements not met',
        description: passwordErrors[0]
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate salt for this user
      const salt = generateSalt();
      
      // Derive multi-chain wallet from email + password + salt (client-side only!)
      // This generates BTC, ETH, and SOL addresses all from one mnemonic
      const multiWallet = await deriveMultiChainWallet(email, password, salt);
      
      // Hash password with bcrypt for server storage
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Send ONLY email, password hash, salt, and all 3 public addresses to server
      const response = await fetch('/auth/email-wallet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          passwordHash,
          salt,
          btcAddress: multiWallet.btc.address,
          ethAddress: multiWallet.eth.address,
          solAddress: multiWallet.sol.address
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create wallet');
      }

      // Save wallet data to show user
      setSeedPhrase(multiWallet.mnemonic);
      setBtcAddress(multiWallet.btc.address);
      setEthAddress(multiWallet.eth.address);
      setSolAddress(multiWallet.sol.address);
      
      // Move to recovery phrase step
      setStep('recovery-phrase');
      
      toast({
        title: 'Wallet created!',
        description: 'Please save your recovery phrase'
      });
    } catch (error: any) {
      console.error('Wallet creation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create wallet. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      toast({
        variant: 'destructive',
        title: 'Password required',
        description: 'Please enter your password'
      });
      return;
    }

    if (isLoginMode && !walletExists) {
      toast({
        variant: 'destructive',
        title: 'No wallet found',
        description: 'No wallet found for this email. Please create one first.'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Login with email and password (no chain parameter needed)
      const response = await fetch('/auth/email-wallet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Re-derive multi-chain wallet on client side to restore all keys
      const multiWallet = await deriveMultiChainWallet(
        email,
        password,
        data.salt
      );
      
      // Store all wallet addresses in sessionStorage (temporary, browser only)
      sessionStorage.setItem('wallet_mnemonic', multiWallet.mnemonic);
      sessionStorage.setItem('btc_address', multiWallet.btc.address);
      sessionStorage.setItem('eth_address', multiWallet.eth.address);
      sessionStorage.setItem('sol_address', multiWallet.sol.address);
      
      toast({
        title: 'Login successful!',
        description: 'Logged into your multi-chain wallet'
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'Invalid email or password'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySeedPhrase = () => {
    navigator.clipboard.writeText(seedPhrase);
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 2000);
  };

  const handleBackupComplete = () => {
    // Store all wallet addresses in sessionStorage
    sessionStorage.setItem('wallet_mnemonic', seedPhrase);
    sessionStorage.setItem('btc_address', btcAddress);
    sessionStorage.setItem('eth_address', ethAddress);
    sessionStorage.setItem('sol_address', solAddress);
    
    toast({
      title: 'Setup complete!',
      description: 'You can now access your multi-chain wallet'
    });
    
    onSuccess();
  };

  return (
    <div className="space-y-4 py-4" data-testid="email-auth-form">
      {step === 'email' && (
        <>
          <Alert className="border-blue-500" data-testid="alert-self-custodial">
            <Wallet className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs">
              <strong>Self-Custodial Wallet:</strong> Your private keys are generated on your device and never sent to our servers.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              disabled={checkingEmail}
              data-testid="input-email"
            />
          </div>

          <Button
            onClick={handleEmailSubmit}
            disabled={checkingEmail || !email}
            className="w-full"
            data-testid="button-continue"
          >
            {checkingEmail ? 'Checking...' : 'Continue'}
          </Button>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('email');
                setPassword('');
                setConfirmPassword('');
              }}
              data-testid="button-back"
            >
              ← Change Email
            </Button>
            <p className="text-sm text-gray-600">{email}</p>
          </div>

          {!isLoginMode && (
            <Alert className="border-blue-500" data-testid="alert-multi-chain">
              <Wallet className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs">
                <strong>Multi-Chain Wallet:</strong> One wallet for Bitcoin, Ethereum, and Solana - all from a single recovery phrase.
              </AlertDescription>
            </Alert>
          )}

          {isLoginMode && walletExists && (
            <Alert className="border-green-500" data-testid="alert-existing-wallet">
              <Wallet className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-xs">
                <strong>Existing Wallet Found:</strong> Login to access your multi-chain wallet (BTC, ETH, SOL).
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              {isLoginMode ? 'Password' : 'Create Password (min 12 characters)'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!isLoginMode && (
              <p className="text-xs text-gray-500">
                Must include: uppercase, lowercase, number, special character
              </p>
            )}
          </div>

          {!isLoginMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWallet()}
                  disabled={isLoading}
                  data-testid="input-confirm-password"
                />
              </div>

              <Alert className="border-yellow-500" data-testid="alert-password-warning">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-xs">
                  <strong>CRITICAL:</strong> If you lose your password AND recovery phrase, your funds are lost FOREVER. We cannot recover them.
                </AlertDescription>
              </Alert>
            </>
          )}

          <Button
            onClick={isLoginMode ? handleLogin : handleCreateWallet}
            disabled={isLoading}
            className="w-full"
            data-testid={isLoginMode ? 'button-login' : 'button-create-wallet'}
          >
            {isLoading ? (
              isLoginMode ? 'Logging in...' : 'Creating Wallet...'
            ) : (
              isLoginMode ? 'Login' : 'Create Wallet'
            )}
          </Button>
        </>
      )}

      {step === 'recovery-phrase' && (
        <>
          <Alert className="border-red-500" data-testid="alert-backup-critical">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-xs">
              <strong>CRITICAL:</strong> Write down these 12 words on paper. This ONE recovery phrase works for all your wallets (BTC, ETH, SOL).
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Your Recovery Phrase</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSeed(!showSeed)}
                data-testid="button-toggle-seed"
              >
                {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded border-2 border-red-500">
              {showSeed ? (
                <p className="font-mono text-sm break-words" data-testid="text-seed-phrase">{seedPhrase}</p>
              ) : (
                <p className="text-sm text-gray-500">Click the eye icon to reveal</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={copySeedPhrase}
              disabled={!showSeed}
              className="w-full"
              data-testid="button-copy-seed"
            >
              {seedCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                </>
              )}
            </Button>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Never share your recovery phrase with anyone. Store it securely offline (write it on paper).
            </p>
          </div>

          <Alert className="border-blue-500" data-testid="alert-multi-chain-addresses">
            <Wallet className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs space-y-2">
              <p><strong>Your Multi-Chain Wallet Addresses:</strong></p>
              <div className="space-y-1 font-mono text-xs">
                <p className="truncate" title={btcAddress}>
                  <strong>BTC:</strong> {btcAddress.slice(0, 20)}...{btcAddress.slice(-10)}
                </p>
                <p className="truncate" title={ethAddress}>
                  <strong>ETH:</strong> {ethAddress.slice(0, 20)}...{ethAddress.slice(-10)}
                </p>
                <p className="truncate" title={solAddress}>
                  <strong>SOL:</strong> {solAddress.slice(0, 20)}...{solAddress.slice(-10)}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={handleBackupComplete} className="w-full" data-testid="button-backup-complete">
            I've Saved My Recovery Phrase Securely
          </Button>
        </>
      )}
    </div>
  );
}
