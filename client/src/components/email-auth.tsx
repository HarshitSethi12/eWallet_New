
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { generateWallet, importWallet } from '@/lib/wallet-manager';
import { Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';

interface EmailAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'login';
}

export function EmailAuth({ open, onOpenChange, mode }: EmailAuthProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'backup'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [importSeed, setImportSeed] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendOTP = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setStep('otp');
        toast({
          title: 'OTP Sent',
          description: 'Check your email for the verification code'
        });
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send OTP. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit code'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp })
      });

      if (response.ok) {
        setStep('password');
      } else {
        throw new Error('Invalid OTP');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Invalid OTP. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Weak password',
        description: 'Password must be at least 8 characters'
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
      // Generate wallet client-side with password encryption
      const { address, seedPhrase: phrase } = await generateWallet(email, password);
      setSeedPhrase(phrase);

      // Send only the wallet ADDRESS to server (not private key!)
      await fetch('/api/auth/email/register-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, walletAddress: address })
      });

      setStep('backup');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create wallet. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Weak password',
        description: 'Password must be at least 8 characters'
      });
      return;
    }

    if (!importSeed || importSeed.split(' ').length !== 12) {
      toast({
        variant: 'destructive',
        title: 'Invalid seed phrase',
        description: 'Please enter a valid 12-word seed phrase'
      });
      return;
    }

    setIsLoading(true);
    try {
      const address = await importWallet(email, importSeed, password);

      await fetch('/api/auth/email/register-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, walletAddress: address })
      });

      toast({
        title: 'Success!',
        description: 'Wallet imported successfully'
      });

      onOpenChange(false);
      window.location.href = '/dashboard';
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to import wallet. Check your seed phrase.'
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
    toast({
      title: 'Wallet created!',
      description: 'You can now access your wallet'
    });
    onOpenChange(false);
    window.location.href = '/dashboard';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Self-Custodial Wallet' : 'Access Your Wallet'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && 'Enter your email to get started'}
            {step === 'otp' && 'Enter the verification code sent to your email'}
            {step === 'password' && 'Create a secure password for your wallet'}
            {step === 'backup' && '⚠️ CRITICAL: Save your seed phrase'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'email' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                />
              </div>
              <Button onClick={handleSendOTP} disabled={isLoading} className="w-full">
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                />
              </div>
              <Button onClick={handleVerifyOTP} disabled={isLoading} className="w-full">
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <Alert className="border-yellow-500">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-xs">
                  <strong>IMPORTANT:</strong> This password encrypts your wallet. If you lose it, your funds are lost FOREVER. We cannot recover it.
                </AlertDescription>
              </Alert>

              {mode === 'create' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password (min 8 characters)</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWallet()}
                    />
                  </div>

                  <Button onClick={handleCreateWallet} disabled={isLoading} className="w-full">
                    {isLoading ? 'Creating Wallet...' : 'Create Wallet'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="importSeed">Seed Phrase (12 words)</Label>
                    <textarea
                      id="importSeed"
                      className="w-full p-2 border rounded min-h-[80px]"
                      placeholder="word1 word2 word3..."
                      value={importSeed}
                      onChange={(e) => setImportSeed(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Wallet Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleImportWallet()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button onClick={handleImportWallet} disabled={isLoading} className="w-full">
                    {isLoading ? 'Importing...' : 'Import Wallet'}
                  </Button>
                </>
              )}
            </>
          )}

          {step === 'backup' && (
            <>
              <Alert className="border-red-500">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-xs">
                  <strong>CRITICAL:</strong> Write down these 12 words on paper. This is the ONLY way to recover your wallet if you lose your password or device.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Your Seed Phrase</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSeed(!showSeed)}
                  >
                    {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded border-2 border-red-500">
                  {showSeed ? (
                    <p className="font-mono text-sm break-words">{seedPhrase}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Click the eye icon to reveal</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={copySeedPhrase}
                  disabled={!showSeed}
                  className="w-full"
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
                  ⚠️ Never share your seed phrase with anyone. We will never ask for it. Store it securely offline.
                </p>
              </div>

              <Button onClick={handleBackupComplete} className="w-full">
                I've Saved My Seed Phrase
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
