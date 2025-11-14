
import { ethers } from 'ethers';

/**
 * Self-Custodial Wallet Manager
 * All wallet operations happen client-side with password encryption
 */

const DB_NAME = 'BitWallet_SelfCustodial';
const DB_VERSION = 1;
const WALLETS_STORE = 'wallets';

interface StoredWallet {
  id: string;
  email: string;
  address: string;
  encryptedJson: string;
  createdAt: number;
  name?: string;
}

/**
 * Initialize IndexedDB for wallet storage
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(WALLETS_STORE)) {
        db.createObjectStore(WALLETS_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Generate a new wallet with password encryption
 */
export async function generateWallet(email: string, password: string, name?: string): Promise<{
  address: string;
  seedPhrase: string;
}> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();
  
  // Encrypt wallet with user's password
  const encryptedJson = await wallet.encrypt(password, {
    scrypt: {
      N: 1024 // Faster for better UX, still secure
    }
  });

  // Store encrypted wallet in IndexedDB
  const db = await openDB();
  const tx = db.transaction(WALLETS_STORE, 'readwrite');
  const store = tx.objectStore(WALLETS_STORE);
  
  const walletData: StoredWallet = {
    id: `wallet_${Date.now()}`,
    email,
    address: wallet.address,
    encryptedJson,
    createdAt: Date.now(),
    name
  };
  
  store.put(walletData);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return {
    address: wallet.address,
    seedPhrase: wallet.mnemonic!.phrase
  };
}

/**
 * Import wallet from seed phrase
 */
export async function importWallet(
  email: string, 
  seedPhrase: string, 
  password: string,
  name?: string
): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Create wallet from seed phrase
  const wallet = ethers.Wallet.fromPhrase(seedPhrase);
  
  // Encrypt with new password
  const encryptedJson = await wallet.encrypt(password, {
    scrypt: {
      N: 1024
    }
  });

  // Store in IndexedDB
  const db = await openDB();
  const tx = db.transaction(WALLETS_STORE, 'readwrite');
  const store = tx.objectStore(WALLETS_STORE);
  
  const walletData: StoredWallet = {
    id: `wallet_${Date.now()}`,
    email,
    address: wallet.address,
    encryptedJson,
    createdAt: Date.now(),
    name
  };
  
  store.put(walletData);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return wallet.address;
}

/**
 * Get all wallets for an email
 */
export async function getWallets(email: string): Promise<StoredWallet[]> {
  const db = await openDB();
  const tx = db.transaction(WALLETS_STORE, 'readonly');
  const store = tx.objectStore(WALLETS_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const wallets = request.result.filter(w => w.email === email);
      resolve(wallets);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Decrypt wallet with password to get signer
 */
export async function getWalletSigner(address: string, password: string): Promise<ethers.Wallet> {
  const db = await openDB();
  const tx = db.transaction(WALLETS_STORE, 'readonly');
  const store = tx.objectStore(WALLETS_STORE);
  
  const wallets: StoredWallet[] = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const walletData = wallets.find(w => w.address === address);
  if (!walletData) {
    throw new Error('Wallet not found');
  }

  try {
    // Decrypt with user's password
    const wallet = await ethers.Wallet.fromEncryptedJson(
      walletData.encryptedJson,
      password
    );
    return wallet;
  } catch (error) {
    throw new Error('Invalid password');
  }
}

/**
 * Send transaction (client-side signing)
 */
export async function sendTransaction(
  fromAddress: string,
  password: string,
  to: string,
  amount: string,
  provider: ethers.Provider
): Promise<string> {
  // Decrypt wallet
  const wallet = await getWalletSigner(fromAddress, password);
  
  // Connect to provider
  const connectedWallet = wallet.connect(provider);
  
  // Send transaction
  const tx = await connectedWallet.sendTransaction({
    to,
    value: ethers.parseEther(amount)
  });
  
  await tx.wait();
  return tx.hash;
}

/**
 * Delete wallet (only if password is correct)
 */
export async function deleteWallet(address: string, password: string): Promise<void> {
  // Verify password first
  await getWalletSigner(address, password);
  
  const db = await openDB();
  const tx = db.transaction(WALLETS_STORE, 'readwrite');
  const store = tx.objectStore(WALLETS_STORE);
  
  const wallets: StoredWallet[] = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const walletData = wallets.find(w => w.address === address);
  if (walletData) {
    store.delete(walletData.id);
  }
  
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Export seed phrase (requires password)
 */
export async function exportSeedPhrase(address: string, password: string): Promise<string> {
  const wallet = await getWalletSigner(address, password);
  if (!wallet.mnemonic) {
    throw new Error('This wallet does not have a seed phrase');
  }
  return wallet.mnemonic.phrase;
}
