
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
      alert('MetaMask is not installed!');
      return null;
    }

    console.log('🔵 MetaMask detected, attempting connection...');

    // Reset state before attempting connection
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Check if MetaMask is locked
      const isUnlocked = await window.ethereum._metamask?.isUnlocked?.();
      console.log('🔵 MetaMask unlock status:', isUnlocked);

      // First, try to get current accounts (if already connected)
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
      
      // Handle specific error codes
      if (error.code === 4001) {
        console.log('👤 User rejected the connection request');
      } else if (error.code === -32002) {
        console.log('⏳ Request already pending in MetaMask');
      }
      
      throw error; // Re-throw to let the calling function handle it
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

  const forceReconnect = async () => {
    // Force disconnect first
    disconnectWallet();
    
    // Small delay to ensure state is reset
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
