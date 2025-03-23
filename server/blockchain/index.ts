
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

export interface WalletAddress {
  address: string;
  privateKey: string;
}

export class BlockchainService {
  static async createBitcoinWallet(): Promise<WalletAddress> {
    const keyPair = bitcoin.ECPair.makeRandom({ network: bitcoin.networks.testnet });
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.testnet 
    });
    
    return {
      address: address!,
      privateKey: keyPair.toWIF()
    };
  }

  static async createEthereumWallet(): Promise<WalletAddress> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  static async getBalance(address: string, chain: 'BTC' | 'ETH'): Promise<string> {
    if (chain === 'ETH') {
      const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } else {
      // Implement BTC balance check using your preferred Bitcoin API
      return '0.0';
    }
  }
}
