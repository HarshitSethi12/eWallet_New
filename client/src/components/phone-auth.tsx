
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Phone, Shield } from 'lucide-react';

interface PhoneAuthProps {
  onSuccess: () => void;
}

export function PhoneAuth({ onSuccess }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch('/auth/phone/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone }),
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
        description: `Verification code sent to ${phoneNumber}`,
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
    mutationFn: async ({ phone, otpCode }: { phone: string; otpCode: string }) => {
      const response = await fetch('/auth/phone/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone, otp: otpCode }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify OTP');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Phone number verified successfully',
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    // Basic phone number validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }
    
    // Format phone number with country code if not present
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    setPhoneNumber(formattedPhone);
    sendOtpMutation.mutate(formattedPhone);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    
    verifyOtpMutation.mutate({ phone: phoneNumber, otpCode: otp });
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
  };

  if (step === 'phone') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Sign in with Phone</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-center"
                disabled={sendOtpMutation.isPending}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                We'll send you a verification code
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={sendOtpMutation.isPending || !phoneNumber}
            >
              {sendOtpMutation.isPending ? 'Sending...' : 'Send Code'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
        <CardTitle>Enter Verification Code</CardTitle>
        <p className="text-sm text-gray-600">
          We sent a 6-digit code to {phoneNumber}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyOtp} className="space-y-4">
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
          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full"
              disabled={verifyOtpMutation.isPending || otp.length !== 6}
            >
              {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify Code'}
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
              className="text-sm"
              onClick={() => sendOtpMutation.mutate(phoneNumber)}
              disabled={sendOtpMutation.isPending}
            >
              Resend Code
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
