
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
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return null;
    }

    // Reset state before attempting connection
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // First, try to get current accounts (if already connected)
      const currentAccounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      let accounts;
      if (currentAccounts.length > 0) {
        // Already connected, use existing accounts
        accounts = currentAccounts;
      } else {
        // Request new connection
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
      }
      
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      setState({
        isConnected: true,
        account: accounts[0],
        chainId,
        isLoading: false,
        isAuthenticated: false
      });

      // Return the connected account address
      return accounts[0];
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      // Reset state completely on error
      setState({
        isConnected: false,
        account: null,
        chainId: null,
        isLoading: false,
        isAuthenticated: false
      });
      
      // Handle user rejection specifically
      if (error.code === 4001) {
        console.log('User rejected the connection request');
      }
      
      return null;
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
    if (!state.account || !window.ethereum) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, state.account]
      });
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
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
