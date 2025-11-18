import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { deriveWalletFromPassword, generateSalt, validatePassword } from '@/lib/self-custodial-wallet';
import { Eye, EyeOff, Copy, Check, AlertTriangle, Wallet } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface EmailAuthProps {
  onSuccess: () => void;
  isLoginMode: boolean;
}

interface ExistingWallet {
  id: number;
  chain: 'ETH' | 'BTC' | 'SOL';
  walletAddress: string;
  createdAt: string;
}

export function EmailAuth({ onSuccess, isLoginMode }: EmailAuthProps) {
  const [step, setStep] = useState<'email' | 'email-password' | 'backup'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [chain, setChain] = useState<'ETH' | 'BTC' | 'SOL'>('ETH');
  const [existingWallets, setExistingWallets] = useState<ExistingWallet[]>([]);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { toast } = useToast();

  const checkExistingWallets = async (emailToCheck: string) => {
    if (!emailToCheck || !/\S+@\S+\.\S+/.test(emailToCheck)) {
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch('/api/auth/email/get-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck.toLowerCase().trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setExistingWallets(data.wallets || []);
        
        if (isLoginMode && data.wallets.length > 0) {
          // Auto-select first wallet when logging in
          setChain(data.wallets[0].chain);
        } else if (!isLoginMode && data.wallets.length > 0) {
          // Auto-select first available chain if creating new wallet
          const usedChains = new Set(data.wallets.map((w: ExistingWallet) => w.chain));
          const availableChain = (['ETH', 'BTC', 'SOL'] as const).find(c => !usedChains.has(c));
          if (availableChain) {
            setChain(availableChain);
          }
        }
      }
    } catch (error) {
      console.error('Error checking wallets:', error);
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
    
    // Check for existing wallets first
    setCheckingEmail(true);
    try {
      const response = await fetch('/api/auth/email/get-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setExistingWallets(data.wallets || []);
        
        // For create mode, check if all chains are used
        if (!isLoginMode) {
          const usedChains = new Set((data.wallets || []).map((w: ExistingWallet) => w.chain));
          const availableChains = (['ETH', 'BTC', 'SOL'] as const).filter(c => !usedChains.has(c));
          
          if (availableChains.length === 0 && data.wallets.length > 0) {
            toast({
              variant: 'destructive',
              title: 'All wallets created',
              description: 'You already have wallets for all supported blockchains (ETH, BTC, SOL). Please log in instead.'
            });
            setCheckingEmail(false);
            return;
          }
          
          // Auto-select first available chain
          if (availableChains.length > 0) {
            setChain(availableChains[0]);
          }
        } else if (isLoginMode && data.wallets.length > 0) {
          // Auto-select first wallet when logging in
          setChain(data.wallets[0].chain);
        }
      }
    } catch (error) {
      console.error('Error checking wallets:', error);
    } finally {
      setCheckingEmail(false);
    }
    
    setStep('email-password');
  };

  const getAvailableChains = (): ('ETH' | 'BTC' | 'SOL')[] => {
    const allChains: ('ETH' | 'BTC' | 'SOL')[] = ['ETH', 'BTC', 'SOL'];
    const usedChains = new Set(existingWallets.map(w => w.chain));
    return allChains.filter(c => !usedChains.has(c));
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
      
      // Derive wallet from email + password + salt (client-side only!)
      const wallet = await deriveWalletFromPassword(email, password, salt, chain);
      
      // Hash password with bcrypt for server storage
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Send ONLY email, password hash, salt, public address, and chain to server
      const response = await fetch('/api/auth/email/create-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          passwordHash,
          salt,
          walletAddress: wallet.address,
          chain: wallet.chain
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create wallet');
      }

      // Save seed phrase to show user
      setSeedPhrase(wallet.mnemonic);
      setWalletAddress(wallet.address);
      
      // Move to backup step
      setStep('backup');
      
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

    if (isLoginMode && existingWallets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No wallet found',
        description: 'No wallets found for this email. Please create one first.'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Login with email, password, and selected chain
      const response = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          chain
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Re-derive wallet on client side to restore keys
      const wallet = await deriveWalletFromPassword(
        email,
        password,
        data.salt,
        data.chain
      );
      
      // Store wallet in sessionStorage (temporary, browser only)
      sessionStorage.setItem('wallet_mnemonic', wallet.mnemonic);
      sessionStorage.setItem('wallet_address', wallet.address);
      sessionStorage.setItem('wallet_chain', wallet.chain);
      
      toast({
        title: 'Login successful!',
        description: `Logged into your ${data.chain} wallet`
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
    // Store wallet in sessionStorage
    sessionStorage.setItem('wallet_mnemonic', seedPhrase);
    sessionStorage.setItem('wallet_address', walletAddress);
    sessionStorage.setItem('wallet_chain', chain);
    
    toast({
      title: 'Setup complete!',
      description: 'You can now access your wallet'
    });
    
    onSuccess();
  };

  const chainNames = {
    ETH: 'Ethereum',
    BTC: 'Bitcoin',
    SOL: 'Solana'
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

      {step === 'email-password' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('email');
                setExistingWallets([]);
                setPassword('');
                setConfirmPassword('');
              }}
              data-testid="button-back"
            >
              ← Change Email
            </Button>
            <p className="text-sm text-gray-600">{email}</p>
          </div>

          {existingWallets.length > 0 && (
            <Alert className="border-green-500" data-testid="alert-existing-wallets">
              <Wallet className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-xs">
                <strong>Existing Wallets:</strong> You have {existingWallets.length} wallet{existingWallets.length > 1 ? 's' : ''} on this account
                <ul className="mt-2 space-y-1">
                  {existingWallets.map(w => (
                    <li key={w.id} className="font-mono text-xs">
                      • {chainNames[w.chain]} - {w.walletAddress.slice(0, 12)}...{w.walletAddress.slice(-8)}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {!isLoginMode && existingWallets.length > 0 && getAvailableChains().length === 0 && (
            <Alert className="border-yellow-500" data-testid="alert-max-wallets">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-xs">
                You already have wallets for all supported blockchains (ETH, BTC, SOL). Please log in instead.
              </AlertDescription>
            </Alert>
          )}

          {!isLoginMode && getAvailableChains().length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="chain">Select Blockchain</Label>
              <select
                id="chain"
                value={chain}
                onChange={(e) => setChain(e.target.value as 'ETH' | 'BTC' | 'SOL')}
                className="w-full p-2 border rounded"
                disabled={isLoading}
                data-testid="select-chain"
              >
                {getAvailableChains().map(c => (
                  <option key={c} value={c}>{chainNames[c]} ({c})</option>
                ))}
              </select>
              {existingWallets.length > 0 && (
                <p className="text-xs text-gray-500">
                  Creating a new {chainNames[chain]} wallet for this account
                </p>
              )}
            </div>
          )}

          {isLoginMode && existingWallets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="chain">Select Wallet</Label>
              <select
                id="chain"
                value={chain}
                onChange={(e) => setChain(e.target.value as 'ETH' | 'BTC' | 'SOL')}
                className="w-full p-2 border rounded"
                disabled={isLoading}
                data-testid="select-chain"
              >
                {existingWallets.map(w => (
                  <option key={w.id} value={w.chain}>
                    {chainNames[w.chain]} ({w.chain}) - {w.walletAddress.slice(0, 12)}...
                  </option>
                ))}
              </select>
            </div>
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
            disabled={isLoading || (!isLoginMode && getAvailableChains().length === 0)}
            className="w-full"
            data-testid={isLoginMode ? 'button-login' : 'button-create-wallet'}
          >
            {isLoading ? (
              isLoginMode ? 'Logging in...' : 'Creating Wallet...'
            ) : (
              !isLoginMode && getAvailableChains().length === 0 ? 
                'All Chains Already Have Wallets' : 
                (isLoginMode ? 'Login' : 'Create Wallet')
            )}
          </Button>
        </>
      )}

      {step === 'backup' && (
        <>
          <Alert className="border-red-500" data-testid="alert-backup-critical">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-xs">
              <strong>CRITICAL:</strong> Write down these 12 words on paper. This is the ONLY way to recover your wallet if you lose your password.
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

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Your wallet address:</strong> <span className="font-mono">{walletAddress}</span>
            </p>
          </div>

          <Button onClick={handleBackupComplete} className="w-full" data-testid="button-backup-complete">
            I've Saved My Recovery Phrase Securely
          </Button>
        </>
      )}
    </div>
  );
}
