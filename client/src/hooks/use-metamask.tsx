
import { useState, useEffect } from 'react';

interface MetaMaskState {
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface MetaMaskUser {
  address: string;
  ensName?: string;
  displayName: string;
}

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    account: null,
    chainId: null,
    isLoading: false,
    isAuthenticated: false
  });

  const connectWallet = async () => {
    console.log('🔵 connectWallet called');
    
    if (!window.ethereum) {
      console.error('❌ MetaMask not found');
      throw new Error('MetaMask is not installed!');
    }

    console.log('🔵 MetaMask detected, attempting connection...');

    // Reset state before attempting connection
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Check for pending requests by trying to get accounts first
      console.log('🔵 Checking for existing connection...');
      const currentAccounts = await window.ethereum.request({
        method: 'eth_accounts'
      });
      console.log('🔵 Current accounts:', currentAccounts);

      let accounts;
      if (currentAccounts.length > 0) {
        // Already connected, use existing accounts
        accounts = currentAccounts;
        console.log('🔵 Using existing connection');
      } else {
        // Request new connection
        console.log('🔵 Requesting new connection...');
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        console.log('🔵 New accounts received:', accounts);
      }
      
      // Ensure we have at least one account
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });
      console.log('🔵 Chain ID:', chainId);

      setState({
        isConnected: true,
        account: accounts[0],
        chainId,
        isLoading: false,
        isAuthenticated: false
      });

      console.log('✅ Wallet connected successfully:', accounts[0]);
      // Return the connected account address
      return accounts[0];
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      
      // Reset state completely on error
      setState({
        isConnected: false,
        account: null,
        chainId: null,
        isLoading: false,
        isAuthenticated: false
      });
      
      // Handle specific error codes and provide user-friendly messages
      if (error.code === 4001) {
        console.log('👤 User rejected the connection request');
        throw new Error('Connection request was rejected. Please try again and approve the connection in MetaMask.');
      } else if (error.code === -32002) {
        console.log('⏳ Request already pending in MetaMask');
        throw new Error('A connection request is already pending in MetaMask. Please check your MetaMask extension and complete or cancel the pending request.');
      } else if (error.message?.includes('timed out')) {
        console.log('⏰ Connection request timed out - likely pending state');
        throw new Error('Connection timed out. MetaMask may have a pending request. Please open MetaMask and complete or cancel any pending requests.');
      }
      
      throw error; // Re-throw the original error if it's not one of the above
    }
  };

  const authenticateWithWallet = async () => {
    if (!state.account) {
      throw new Error('No wallet connected');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Create a message to sign for authentication
      const message = `Sign this message to authenticate with BitWallet.\n\nAddress: ${state.account}\nTimestamp: ${Date.now()}`;
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, state.account]
      });

      // Send signature to backend for verification
      const response = await fetch('/api/auth/metamask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: state.account,
          message,
          signature
        })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const userData = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: true, 
        isLoading: false 
      }));

      return userData;
    } catch (error) {
      console.error('Authentication failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const getUserInfo = (): MetaMaskUser | null => {
    if (!state.account) return null;
    
    return {
      address: state.account,
      displayName: `${state.account.slice(0, 6)}...${state.account.slice(-4)}`
    };
  };

  const disconnectWallet = () => {
    // Clear localStorage
    window.localStorage.removeItem('metamask-connected');
    
    setState({
      isConnected: false,
      account: null,
      chainId: null,
      isLoading: false,
      isAuthenticated: false
    });
  };

  const clearPendingRequests = async () => {
    console.log('🔵 Attempting to clear pending requests...');
    if (!window.ethereum) return false;

    try {
      // Try to get accounts to see if there's a pending request
      await window.ethereum.request({
        method: 'eth_accounts'
      });
      console.log('✅ No pending requests detected');
      return true;
    } catch (error) {
      if (error.code === -32002) {
        console.log('⚠️ Pending request detected');
        return false;
      }
      return true;
    }
  };

  const forceReconnect = async () => {
    console.log('🔵 Force reconnect initiated...');
    
    // First check for pending requests
    const canProceed = await clearPendingRequests();
    if (!canProceed) {
      throw new Error('MetaMask has pending requests. Please open MetaMask and complete or cancel them first.');
    }
    
    // Force disconnect first
    disconnectWallet();
    
    // Small delay to ensure state is reset
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to connect again
    return connectWallet();
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setState(prev => ({ ...prev, account: accounts[0] }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({ ...prev, chainId }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const signMessage = async (message: string) => {
    console.log('🔵 signMessage called with:', { message, account: state.account });
    
    if (!state.account || !window.ethereum) {
      const error = new Error('No wallet connected');
      console.error('❌', error.message);
      throw error;
    }

    try {
      console.log('🔵 Requesting signature from MetaMask...');
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, state.account]
      });
      console.log('✅ Signature received:', signature ? 'Yes' : 'No');
      return signature;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    authenticateWithWallet,
    getUserInfo,
    signMessage,
    forceReconnect,
    isConnecting: state.isLoading,
    account: state.account
  };
}
