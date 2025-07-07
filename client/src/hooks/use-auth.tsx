import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMetaMask } from "./use-metamask";

interface User {
  id: string;
  email?: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string | null;
  phone?: string;
  provider?: string;
  walletAddress?: string;
}

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/auth/user");
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/auth/google";
    },
  });

  const appleLoginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/auth/apple";
    },
  });

  const metamaskLoginMutation = useMutation({
    mutationFn: async ({ message, signature, address }: { message: string; signature: string; address: string }) => {
      const response = await fetch("/api/auth/metamask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, signature, address }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "MetaMask authentication failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ MetaMask authentication successful:', data);
      queryClient.invalidateQueries({ queryKey: ["/auth/user"] });
      toast({
        title: "Welcome!",
        description: "You have been signed in with MetaMask.",
      });
      // Route to dashboard after successful authentication
      setLocation("/dashboard");
    },
    onError: (error) => {
      console.error('❌ MetaMask authentication failed:', error);
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear MetaMask connection if user is using MetaMask
      if (user?.provider === 'metamask') {
        try {
          // Clear localStorage and sessionStorage
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch (error) {
          console.error('Error clearing storage:', error);
        }
      }

      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.clear();

      // Force a complete page reload for MetaMask users to ensure clean state
      if (user?.provider === 'metamask') {
        window.location.href = '/';
      } else {
        setLocation("/");
      }

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    },
    onError: (error) => {
      console.error("Logout failed:", error);
      // Force reload as fallback for MetaMask users
      if (user?.provider === 'metamask') {
        window.location.href = '/';
      }
      toast({
        title: "Logout failed",
        description: "There was an error signing you out.",
        variant: "destructive",
      });
    },
  });

  // Check session status function
  const checkSessionStatus = async () => {
    try {
      console.log('🔍 Checking session status...');
      const response = await fetch("/auth/user", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Session active:', userData);
        return {
          isActive: true,
          user: userData,
          provider: userData.provider || userData.authMethod
        };
      } else {
        console.log('❌ Session expired or invalid');
        return {
          isActive: false,
          user: null,
          provider: null
        };
      }
    } catch (error) {
      console.error('🚨 Session check failed:', error);
      return {
        isActive: false,
        user: null,
        provider: null,
        error: error.message
      };
    }
  };

  // Enhanced logging for debugging
  React.useEffect(() => {
    if (user?.data) {
      console.log('🔐 Auth Status - User found:', {
        provider: user.data.provider || user.data.authMethod,
        address: user.data.walletAddress || user.data.address,
        name: user.data.name || user.data.displayName,
        isAuthenticated: !!user?.data
      });
    } else {
      console.log('🔓 Auth Status - No user found, isAuthenticated:', !!user?.data);
    }
  }, [user?.data]);

  return {
    user: user?.data || null,
    isAuthenticated: !!user?.data,
    login: loginMutation.mutate,
    loginWithApple: appleLoginMutation.mutate,
    loginWithMetaMask: metamaskLoginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    isMetaMaskLoading: metamaskLoginMutation.isPending,
    checkSessionStatus,
  };
}