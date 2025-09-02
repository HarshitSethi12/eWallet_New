// ===== IMPORT SECTION =====
// This section imports all the external libraries and components needed for authentication

// React Query for data fetching and caching
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Wouter for client-side routing (navigation between pages)
import { useLocation } from "wouter";
// React hooks for state management
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
// API request helper function
import { apiRequest } from "@/lib/queryClient";

// ===== TYPE DEFINITIONS =====
// Define TypeScript interfaces for type safety

// Interface defining what user data looks like
interface User {
  id?: string;                    // Unique user identifier
  email?: string;                 // User's email address
  name?: string;                  // User's display name
  given_name?: string;            // User's first name
  family_name?: string;           // User's last name
  picture?: string;               // URL to user's profile picture
  provider?: 'google' | 'metamask' | 'phone';  // Authentication method used
  walletAddress?: string;         // MetaMask wallet address (if using MetaMask)
  phone?: string;                 // Phone number (if using phone auth)
}

// Interface defining the authentication context structure
interface AuthContextType {
  user: User | null;              // Current user data or null if not logged in
  isAuthenticated: boolean;       // Whether user is currently authenticated
  login: () => void;              // Function to start Google OAuth login
  loginWithMetaMask: (data: { message: string; signature: string; address: string }) => void;  // MetaMask login function
  logout: () => void;             // Function to log out user
  isLoading: boolean;             // Whether authentication is in progress
  isLoggingOut: boolean;          // Whether logout is in progress
  isMetaMaskLoading: boolean;     // Whether MetaMask authentication is in progress
  checkSessionStatus: () => Promise<any>;  // Function to verify session status
}

// ===== CONTEXT CREATION =====
// Create React context for sharing authentication state across components
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== AUTHENTICATION PROVIDER COMPONENT =====
// This component wraps the entire app and provides authentication functionality
export function AuthProvider({ children }: { children: ReactNode }) {
  // ===== STATE MANAGEMENT =====
  // Local state to track authentication status and user data
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMetaMaskLoading, setIsMetaMaskLoading] = useState(false);

  // ===== ROUTING HOOKS =====
  // Get navigation function to redirect users after authentication
  const [, setLocation] = useLocation();

  // ===== REACT QUERY SETUP =====
  // Query client for invalidating cached data
  const queryClient = useQueryClient();

  // ===== USER SESSION QUERY =====
  // Automatically check if user is logged in when app loads
  const { data: sessionUser, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['auth-user'],        // Unique key for this query
    queryFn: () => apiRequest('/auth/user'),  // Function to fetch user data
    retry: 1,                       // Only retry once if it fails
    staleTime: 5 * 60 * 1000,      // Consider data fresh for 5 minutes
  });

  // ===== SESSION STATUS CHECK FUNCTION =====
  // Function to manually verify if user's session is still valid
  const checkSessionStatus = async () => {
    try {
      console.log('🔍 Checking session status...');
      const response = await fetch('/auth/user', {
        method: 'GET',
        credentials: 'include',      // Include cookies in request
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Session check response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Session is active:', userData);
        return {
          isActive: true,
          user: userData,
          provider: userData.provider || 'unknown'
        };
      } else {
        console.log('❌ Session is inactive or expired');
        return {
          isActive: false,
          error: 'Session expired or invalid'
        };
      }
    } catch (error) {
      console.error('❌ Session check failed:', error);
      return {
        isActive: false,
        error: error.message || 'Session check failed'
      };
    }
  };

  // ===== GOOGLE OAUTH LOGIN FUNCTION =====
  // Function to initiate Google OAuth authentication
  const login = () => {
    console.log('🔵 Starting Google OAuth login...');
    setIsLoading(true);

    // Redirect to our backend's Google OAuth endpoint
    // The backend will handle the OAuth flow and redirect back
    window.location.href = '/auth/google';
  };

  // ===== METAMASK LOGIN MUTATION =====
  // React Query mutation for MetaMask authentication
  const loginWithMetaMaskMutation = useMutation({
    // Function that sends MetaMask signature to backend for verification
    mutationFn: async (data: { message: string; signature: string; address: string }) => {
      console.log('🔵 Sending MetaMask auth data to backend...');
      console.log('🔵 Request URL: /api/auth/metamask');
      console.log('🔵 Request data:', { address: data.address, hasMessage: !!data.message, hasSignature: !!data.signature });
      
      const response = await fetch('/auth/metamask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',      // Include cookies for session
        body: JSON.stringify(data),   // Send signature data
      });

      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response headers:', response.headers.get('content-type'));

      // Get response text first to check if it's valid JSON
      const responseText = await response.text();
      console.log('🔵 Response text:', responseText.substring(0, 200));

      if (!response.ok) {
        console.error('❌ MetaMask auth failed:', responseText);
        
        // Try to parse as JSON if possible, otherwise use text
        let errorMessage = `Authentication failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${responseText.substring(0, 100)}`;
        }
        
        throw new Error(errorMessage);
      }

      // Try to parse response as JSON
      try {
        const result = JSON.parse(responseText);
        console.log('✅ MetaMask authentication successful:', result);
        return result;
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        console.error('❌ Response text:', responseText.substring(0, 500));
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response looks like HTML (common cause of this error)
        if (responseText.trim().startsWith('<')) {
          throw new Error('Server returned HTML instead of JSON. This usually indicates a routing error or server crash.');
        } else if (responseText.trim() === '') {
          throw new Error('Server returned empty response. The server may be offline or crashed.');
        } else {
          throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
        }
      }
    },
    // Function called when authentication succeeds
    onSuccess: (data) => {
      console.log('✅ MetaMask login successful, redirecting to dashboard...');
      setIsMetaMaskLoading(false);

      // Invalidate auth query to refetch user data
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });

      // Redirect to dashboard
      setLocation('/dashboard');
    },
    // Function called when authentication fails
    onError: (error) => {
      console.error('❌ MetaMask login failed:', error);
      setIsMetaMaskLoading(false);
      alert(`MetaMask authentication failed: ${error.message}`);
    },
  });

  // ===== METAMASK LOGIN WRAPPER FUNCTION =====
  // Wrapper function that sets loading state and triggers the mutation
  const loginWithMetaMask = (data: { message: string; signature: string; address: string }) => {
    console.log('🔵 loginWithMetaMask called');
    setIsMetaMaskLoading(true);
    loginWithMetaMaskMutation.mutate(data);
  };

  // ===== LOGOUT MUTATION =====
  // React Query mutation for logging out the user
  const logoutMutation = useMutation({
    // Function that calls the logout endpoint
    mutationFn: async () => {
      console.log('🔵 Calling logout endpoint...');
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',      // Include cookies for session
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    // Function called when logout succeeds
    onSuccess: () => {
      console.log('✅ Logout successful');

      // Clear user state immediately
      setUser(null);
      setIsLoggingOut(false);

      // Clear all cached data
      queryClient.clear();

      // Force immediate redirect to home page
      window.location.href = '/';
    },
    // Function called when logout fails
    onError: (error) => {
      console.error('❌ Logout failed:', error);
      setIsLoggingOut(false);

      // Even if logout fails, clear local state and redirect immediately
      setUser(null);
      queryClient.clear();
      
      // Force immediate redirect to home page
      window.location.href = '/';
    },
  });

  // ===== LOGOUT WRAPPER FUNCTION =====
  // Wrapper function that sets loading state and triggers logout
  const logout = () => {
    console.log('🔵 Logout initiated');
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  // ===== USER STATE SYNCHRONIZATION EFFECT =====
  // Effect to sync user state with session query results
  useEffect(() => {
    if (sessionUser && !sessionError) {
      console.log('✅ Session user found, updating local state');
      setUser(sessionUser);
      setIsLoading(false);
    } else if (sessionError) {
      console.log('❌ Session error, clearing user state');
      setUser(null);
      setIsLoading(false);
    } else if (!sessionLoading) {
      console.log('ℹ️ No session found, user not authenticated');
      setUser(null);
      setIsLoading(false);
    }
  }, [sessionUser, sessionError, sessionLoading]);

  // ===== AUTHENTICATION STATUS CALCULATION =====
  // Determine if user is authenticated based on user state
  const isAuthenticated = !!user;

  // ===== CONTEXT VALUE =====
  // Object containing all authentication functions and state
  const value: AuthContextType = {
    user,                           // Current user data
    isAuthenticated,                // Authentication status
    login,                          // Google OAuth login function
    loginWithMetaMask,              // MetaMask login function
    logout,                         // Logout function
    isLoading: isLoading || sessionLoading,  // Combined loading state
    isLoggingOut,                   // Logout loading state
    isMetaMaskLoading,              // MetaMask loading state
    checkSessionStatus,             // Session verification function
  };

  // ===== PROVIDER RENDER =====
  // Provide authentication context to all child components
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ===== CUSTOM HOOK =====
// Custom hook to use authentication context in components
export function useAuth() {
  // Get authentication context
  const context = useContext(AuthContext);

  // Throw error if hook is used outside of AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}