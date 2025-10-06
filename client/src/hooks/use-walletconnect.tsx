
import { useState, useEffect } from 'react';
import { connect, disconnect, getAccount, watchAccount } from '@wagmi/core';
import { walletConnect } from '@wagmi/connectors';
import { config } from '@/lib/walletconnect-config';

interface WalletConnectState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  isLoading: boolean;
  connector: string | null;
}

export function useWalletConnect() {
  const [state, setState] = useState<WalletConnectState>({
    isConnected: false,
    account: null,
    chainId: null,
    isLoading: false,
    connector: null
  });

  useEffect(() => {
    // Check initial connection
    const account = getAccount(config);
    if (account.isConnected) {
      setState({
        isConnected: true,
        account: account.address || null,
        chainId: account.chainId || null,
        isLoading: false,
        connector: account.connector?.name || null
      });
    }

    // Watch for account changes
    const unwatch = watchAccount(config, {
      onChange: (account) => {
        setState({
          isConnected: account.isConnected,
          account: account.address || null,
          chainId: account.chainId || null,
          isLoading: false,
          connector: account.connector?.name || null
        });
      }
    });

    return () => unwatch();
  }, []);

  const connectWallet = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await connect(config, {
        connector: walletConnect({
          projectId: 'YOUR_PROJECT_ID',
          showQrModal: true
        })
      });

      setState({
        isConnected: true,
        account: result.accounts[0],
        chainId: result.chainId,
        isLoading: false,
        connector: 'WalletConnect'
      });

      return result.accounts[0];
    } catch (error) {
      console.error('WalletConnect connection failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect(config);
      setState({
        isConnected: false,
        account: null,
        chainId: null,
        isLoading: false,
        connector: null
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      throw error;
    }
  };

  const signMessage = async (message: string) => {
    if (!state.account) {
      throw new Error('No wallet connected');
    }

    // Import signMessage from wagmi when needed
    const { signMessage: wagmiSignMessage } = await import('@wagmi/core');
    
    try {
      const signature = await wagmiSignMessage(config, {
        message,
        account: state.account as `0x${string}`
      });
      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  };

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    signMessage,
    isConnecting: state.isLoading
  };
}
