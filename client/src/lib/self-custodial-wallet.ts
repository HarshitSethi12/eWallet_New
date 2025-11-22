/**
 * SELF-CUSTODIAL WALLET GENERATION
 * 
 * This module generates cryptocurrency wallets deterministically from email + password.
 * Private keys are generated client-side and NEVER sent to the server.
 * 
 * Security model:
 * 1. User enters email + password
 * 2. Client derives wallet from password using PBKDF2
 * 3. Client generates BIP39 mnemonic → BIP32 seed → Private keys
 * 4. Client sends ONLY email, public address, and password hash to server
 * 5. Server stores ONLY email, password hash (bcrypt), and public address
 */

import { scrypt } from '@noble/hashes/scrypt.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export interface GeneratedWallet {
  mnemonic: string;           // 12-word recovery phrase (KEEP SECRET!)
  privateKey: string;         // Private key hex (KEEP SECRET!)
  publicKey: string;          // Public key
  address: string;            // Wallet address (can share)
  chain: 'ETH' | 'BTC' | 'SOL';
}

export interface MultiChainWallet {
  mnemonic: string;           // 12-word recovery phrase (KEEP SECRET!)
  btc: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
  eth: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
  sol: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
}

/**
 * Generates a cryptographically secure random salt
 */
export function generateSalt(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

/**
 * Derives multi-chain wallets (BTC, ETH, SOL) from email + password
 * Uses scrypt for memory-hard key derivation (better GPU resistance than PBKDF2)
 * 
 * @param email - User's email address
 * @param password - User's password (min 12 characters recommended)
 * @param salt - Random salt for key derivation (hex string)
 * @returns Multi-chain wallet with BTC, ETH, and SOL addresses
 */
export async function deriveMultiChainWallet(
  email: string,
  password: string,
  salt: string
): Promise<MultiChainWallet> {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Enforce strong password requirements
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    throw new Error(passwordErrors.join(', '));
  }

  // Derive a seed from password + email + salt using scrypt
  // This ensures different users with same password get different wallets
  // scrypt is memory-hard, making it resistant to GPU/ASIC attacks
  const derivationInput = new TextEncoder().encode(`${email}:${password}`);
  const saltBytes = hexToBytes(salt);
  
  // scrypt with N=2^15, r=8, p=1 (good balance of security and performance)
  const derivedSeed = scrypt(derivationInput, saltBytes, {
    N: 32768, // 2^15 - CPU/memory cost parameter
    r: 8,     // block size parameter
    p: 1,     // parallelization parameter
    dkLen: 64 // output length in bytes
  });

  // Generate BIP39 mnemonic from derived seed
  // We use the first 16 bytes for 12-word mnemonic (128 bits)
  const entropyBytes = derivedSeed.slice(0, 16);
  const mnemonic = entropyToMnemonic(entropyBytes, wordlist);

  // Convert mnemonic to BIP32 seed
  const bip32Seed = mnemonicToSeedSync(mnemonic);
  
  // Derive all three chain wallets from the same mnemonic
  const ethWallet = deriveEthereumWallet(mnemonic, bip32Seed);
  const btcWallet = deriveBitcoinWallet(mnemonic, bip32Seed);
  const solWallet = deriveSolanaWallet(mnemonic, bip32Seed);

  return {
    mnemonic,
    btc: {
      privateKey: btcWallet.privateKey,
      publicKey: btcWallet.publicKey,
      address: btcWallet.address,
    },
    eth: {
      privateKey: ethWallet.privateKey,
      publicKey: ethWallet.publicKey,
      address: ethWallet.address,
    },
    sol: {
      privateKey: solWallet.privateKey,
      publicKey: solWallet.publicKey,
      address: solWallet.address,
    }
  };
}

/**
 * Derives a wallet deterministically from email + password for a specific chain
 * DEPRECATED: Use deriveMultiChainWallet instead for new wallets
 * 
 * @param email - User's email address
 * @param password - User's password (min 12 characters recommended)
 * @param salt - Random salt for key derivation (hex string)
 * @param chain - Blockchain to generate wallet for
 * @returns Generated wallet with mnemonic, keys, and address
 */
export async function deriveWalletFromPassword(
  email: string,
  password: string,
  salt: string,
  chain: 'ETH' | 'BTC' | 'SOL' = 'ETH'
): Promise<GeneratedWallet> {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Enforce strong password requirements
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    throw new Error(passwordErrors.join(', '));
  }

  // Derive a seed from password + email + salt using scrypt
  // This ensures different users with same password get different wallets
  // scrypt is memory-hard, making it resistant to GPU/ASIC attacks
  const derivationInput = new TextEncoder().encode(`${email}:${password}`);
  const saltBytes = hexToBytes(salt);
  
  // scrypt with N=2^15, r=8, p=1 (good balance of security and performance)
  const derivedSeed = scrypt(derivationInput, saltBytes, {
    N: 32768, // 2^15 - CPU/memory cost parameter
    r: 8,     // block size parameter
    p: 1,     // parallelization parameter
    dkLen: 64 // output length in bytes
  });

  // Generate BIP39 mnemonic from derived seed
  // We use the first 16 bytes for 12-word mnemonic (128 bits)
  const entropyBytes = derivedSeed.slice(0, 16);
  const mnemonic = entropyToMnemonic(entropyBytes, wordlist);

  // Convert mnemonic to BIP32 seed
  const bip32Seed = mnemonicToSeedSync(mnemonic);
  
  // Derive wallet based on chain
  if (chain === 'ETH') {
    return deriveEthereumWallet(mnemonic, bip32Seed);
  } else if (chain === 'BTC') {
    return deriveBitcoinWallet(mnemonic, bip32Seed);
  } else if (chain === 'SOL') {
    return deriveSolanaWallet(mnemonic, bip32Seed);
  }
  
  throw new Error(`Unsupported chain: ${chain}`);
}

/**
 * Derives an Ethereum wallet from BIP39 mnemonic
 * Uses standard Ethereum derivation path: m/44'/60'/0'/0/0
 */
function deriveEthereumWallet(mnemonic: string, seed: Uint8Array): GeneratedWallet {
  // Standard Ethereum derivation path
  const hdkey = HDKey.fromMasterSeed(seed);
  const path = "m/44'/60'/0'/0/0"; // BIP44 standard for Ethereum
  const derived = hdkey.derive(path);
  
  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }
  
  // Create ethers wallet from private key (browser-safe conversion)
  const privateKeyHex = '0x' + bytesToHex(derived.privateKey);
  const wallet = new ethers.Wallet(privateKeyHex);
  
  return {
    mnemonic,
    privateKey: privateKeyHex,
    publicKey: wallet.signingKey.publicKey,
    address: wallet.address,
    chain: 'ETH'
  };
}

/**
 * Derives a Bitcoin wallet from BIP39 mnemonic
 * Uses standard Bitcoin derivation path: m/84'/0'/0'/0/0 (Native SegWit)
 * Generates real Bech32 addresses (bc1...) that can receive actual Bitcoin
 */
function deriveBitcoinWallet(mnemonic: string, seed: Uint8Array): GeneratedWallet {
  // Use Native SegWit (Bech32) derivation path for modern Bitcoin addresses
  const hdkey = HDKey.fromMasterSeed(seed);
  const path = "m/84'/0'/0'/0/0"; // BIP84 standard for Native SegWit
  const derived = hdkey.derive(path);
  
  if (!derived.privateKey || !derived.publicKey) {
    throw new Error('Failed to derive Bitcoin keys');
  }
  
  const privateKeyHex = '0x' + bytesToHex(derived.privateKey);
  const publicKeyHex = '0x' + bytesToHex(derived.publicKey);
  
  // Generate real Bech32 address using bitcoinjs-lib
  // This creates a valid bc1... address that can receive Bitcoin on mainnet
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: derived.publicKey, // Uint8Array works directly with bitcoinjs-lib
    network: bitcoin.networks.bitcoin // Use mainnet
  });
  
  if (!address) {
    throw new Error('Failed to generate Bitcoin address');
  }
  
  return {
    mnemonic,
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    address, // Real Bech32 address (bc1...)
    chain: 'BTC'
  };
}

/**
 * Derives a Solana wallet from BIP39 mnemonic
 * Uses standard Solana derivation path: m/44'/501'/0'/0'
 * Note: For full Phantom/Solflare compatibility, ed25519 SLIP-0010 derivation is required
 * This implementation uses a simplified approach that generates valid Solana addresses
 * Generates real Base58-encoded addresses that can receive actual Solana (SOL)
 */
function deriveSolanaWallet(mnemonic: string, seed: Uint8Array): GeneratedWallet {
  // Standard Solana derivation path (BIP44 for Solana)
  const path = "m/44'/501'/0'/0'";
  
  // Derive using standard BIP32
  const hdkey = HDKey.fromMasterSeed(seed);
  const derived = hdkey.derive(path);
  
  if (!derived.privateKey) {
    throw new Error('Failed to derive Solana keys');
  }
  
  // Use the first 32 bytes of the private key as the seed for Solana keypair
  const secretKey = derived.privateKey.slice(0, 32);
  
  // Create Solana keypair from the derived seed
  const keypair = Keypair.fromSeed(secretKey);
  
  // Get the public key and encode it as Base58 (standard Solana address format)
  const publicKey = keypair.publicKey;
  const address = publicKey.toBase58(); // Real Solana address
  
  const privateKeyHex = '0x' + bytesToHex(secretKey);
  const publicKeyHex = '0x' + bytesToHex(publicKey.toBytes());
  
  return {
    mnemonic,
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    address, // Real Base58-encoded Solana address
    chain: 'SOL'
  };
}

/**
 * Validates password strength
 * Returns validation errors or empty array if valid
 * Enforces high-entropy passwords for self-custodial wallet security
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}

/**
 * Validates a Bitcoin address
 * Supports Bech32 (bc1...), P2PKH (1...), and P2SH (3...) formats
 */
export function validateBitcoinAddress(address: string): boolean {
  try {
    // Try to decode as Bech32 (bc1...)
    if (address.startsWith('bc1')) {
      bitcoin.address.fromBech32(address);
      return true;
    }
    
    // Try to decode as Base58Check (1... or 3...)
    bitcoin.address.fromBase58Check(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates an Ethereum address
 * Checks if address is a valid 40-character hex string with 0x prefix
 */
export function validateEthereumAddress(address: string): boolean {
  try {
    // Use ethers.js built-in validation
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * Validates a Solana address
 * Checks if address is a valid Base58-encoded 32-byte public key
 */
export function validateSolanaAddress(address: string): boolean {
  try {
    // Try to create a PublicKey from the address
    // This will throw if the address is invalid
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Encrypts wallet data for secure storage in browser
 * (Optional: for future use with browser-based encryption)
 */
export function encryptForBrowser(data: string, password: string): string {
  // For now, return as-is
  // In production, implement browser-based encryption (Web Crypto API)
  return data;
}
