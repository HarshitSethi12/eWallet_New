import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Mail, Shield, Key, Copy, Download, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailAuthProps {
  onSuccess: (walletData: any) => void;
  isLoginMode?: boolean;
}

export function EmailAuth({ onSuccess, isLoginMode = false }: EmailAuthProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'walletSelect' | 'wallet'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [walletData, setWalletData] = useState<any>(null);
  const [walletList, setWalletList] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await fetch('/auth/email/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send OTP');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setStep('otp');
      toast({
        title: 'OTP Sent!',
        description: `Verification code sent to ${email}`,
      });

      // In development, show the OTP
      if (data.otp) {
        toast({
          title: 'Development Mode',
          description: `Your OTP is: ${data.otp}`,
          variant: 'default',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ emailAddress, otpCode, walletId }: { emailAddress: string; otpCode: string; walletId?: number }) => {
      const endpoint = isLoginMode ? '/auth/email/login' : '/auth/email/verify-otp';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailAddress, otp: otpCode, walletId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify OTP');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (isLoginMode && data.requiresWalletSelection) {
        // Login mode - show wallet selection
        setWalletList(data.wallets);
        setStep('walletSelect');
        toast({
          title: 'Select Your Wallet',
          description: `Found ${data.wallets.length} wallet(s) for this email`,
        });
      } else if (isLoginMode && data.loginComplete) {
        // Wallet selected - redirect to dashboard
        toast({
          title: 'Success!',
          description: 'Login successful',
        });
        onSuccess(data);
      } else {
        // Creation mode - show wallet details
        setWalletData(data.wallet);
        setStep('wallet');
        toast({
          title: 'Success!',
          description: 'Email verified and wallet created successfully',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    sendOtpMutation.mutate(email);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;

    verifyOtpMutation.mutate({ emailAddress: email, otpCode: otp });
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const handleDownloadBackup = () => {
    const backup = {
      email: email,
      address: walletData.address,
      seedPhrase: walletData.seedPhrase,
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitwallet-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Backup Downloaded',
      description: 'Keep this file safe and secure',
    });
  };

  const handleContinueToDashboard = () => {
    console.log('✅ Redirecting to dashboard with wallet data:', walletData);
    
    // Ensure we pass the complete wallet object with session data
    const completeWalletData = {
      ...walletData,
      email: email,
      provider: 'email',
      isNewWallet: true
    };
    
    console.log('📦 Complete wallet data being passed:', completeWalletData);
    onSuccess(completeWalletData);
  };

  // Email Step
  if (step === 'email') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>{isLoginMode ? 'Login to Your Wallet' : 'Create Your Wallet'}</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {isLoginMode ? 'Enter your registered email to login' : 'Enter your email to create a self-custodial wallet'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-center"
                disabled={sendOtpMutation.isPending}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                We'll send you a verification code
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={sendOtpMutation.isPending || !email}
            >
              {sendOtpMutation.isPending ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Wallet Selection Step (Login Mode)
  if (step === 'walletSelect') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Select Your Wallet</CardTitle>
          <p className="text-sm text-gray-600">
            Choose which wallet to login to
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {walletList.map((wallet) => (
              <Button
                key={wallet.id}
                variant={selectedWalletId === wallet.id ? "default" : "outline"}
                className="w-full justify-start text-left h-auto py-4"
                onClick={() => setSelectedWalletId(wallet.id)}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="font-mono text-sm truncate w-full">
                    {wallet.address}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(wallet.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Button>
            ))}
          </div>
          <div className="space-y-2 mt-4">
            <Button
              className="w-full"
              disabled={!selectedWalletId || verifyOtpMutation.isPending}
              onClick={() => {
                if (selectedWalletId) {
                  verifyOtpMutation.mutate({ 
                    emailAddress: email, 
                    otpCode: otp, 
                    walletId: selectedWalletId 
                  });
                }
              }}
            >
              {verifyOtpMutation.isPending ? 'Logging in...' : 'Login to Selected Wallet'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep('email');
                setWalletList([]);
                setSelectedWalletId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // OTP Verification Step
  if (step === 'otp') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Enter Verification Code</CardTitle>
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to {email}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={verifyOtpMutation.isPending}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
              >
                {verifyOtpMutation.isPending
                  ? (isLoginMode ? 'Logging in...' : 'Creating Wallet...')
                  : (isLoginMode ? 'Verify & Login' : 'Verify & Create Wallet')
                }
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBack}
                disabled={verifyOtpMutation.isPending}
              >
                Back
              </Button>
            </div>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-blue-600"
                onClick={() => sendOtpMutation.mutate(email)}
                disabled={sendOtpMutation.isPending}
              >
                {sendOtpMutation.isPending ? 'Sending...' : 'Resend Code'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Wallet Created Step
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-6 h-6 text-green-600" />
        </div>
        <CardTitle>Wallet Created Successfully! 🎉</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Your self-custodial wallet has been created. Please backup your recovery information.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-800">
            ⚠️ <strong>Important:</strong> Save your seed phrase and private key in a secure location.
            You'll need them to recover your wallet. Never share them with anyone!
          </AlertDescription>
        </Alert>

        {/* Wallet Address */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Wallet Address</label>
          <div className="flex gap-2">
            <Input
              value={walletData?.address || ''}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyToClipboard(walletData?.address, 'Address')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Seed Phrase */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Recovery Seed Phrase (12 words)</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={showSeedPhrase ? walletData?.seedPhrase : '••••••••••••••••••••••••••••••••'}
                readOnly
                className="font-mono text-sm"
                type={showSeedPhrase ? 'text' : 'password'}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSeedPhrase(!showSeedPhrase)}
              >
                {showSeedPhrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyToClipboard(walletData?.seedPhrase, 'Seed Phrase')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {showSeedPhrase && (
              <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
                {walletData?.seedPhrase?.split(' ').map((word: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{index + 1}.</span>
                    <span className="font-mono">{word}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Private Key */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Private Key</label>
          <div className="flex gap-2">
            <Input
              value={showPrivateKey ? walletData?.privateKey : '••••••••••••••••••••••••••••••••'}
              readOnly
              className="font-mono text-sm"
              type={showPrivateKey ? 'text' : 'password'}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
            >
              {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyToClipboard(walletData?.privateKey, 'Private Key')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-6 border-t border-gray-200 mt-6">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-base"
            onClick={handleContinueToDashboard}
          >
            Go to Dashboard
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={handleDownloadBackup}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Backup File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}