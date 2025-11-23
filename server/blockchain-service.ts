/**
 * Blockchain Service - Fetches real balance and transaction data from live blockchains
 * Integrates with Bitcoin, Ethereum, and Solana networks
 */

interface BalanceResult {
  balance: string;
  balanceUsd: number;
  symbol: string;
  address: string;
}

/**
 * Safely convert wei to ETH using BigInt to avoid overflow
 */
function weiToEth(wei: string | bigint): string {
  const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei;
  const ethBigInt = weiBigInt / BigInt(1e18);
  const remainder = weiBigInt % BigInt(1e18);
  
  // Format with up to 18 decimal places
  const decimals = remainder.toString().padStart(18, '0');
  const trimmedDecimals = decimals.replace(/0+$/, '') || '0';
  
  return ethBigInt === BigInt(0) && trimmedDecimals === '0'
    ? '0'
    : `${ethBigInt}.${trimmedDecimals}`;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  confirmations: number;
  status: 'confirmed' | 'pending' | 'failed';
  fee?: string;
  blockNumber?: number;
}

/**
 * Fetch Bitcoin balance from blockchain.info API
 */
export async function getBitcoinBalance(address: string): Promise<BalanceResult> {
  try {
    const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
    
    if (!response.ok) {
      throw new Error(`Bitcoin API error: ${response.statusText}`);
    }
    
    const balanceSatoshis = await response.text();
    const balanceBTC = parseInt(balanceSatoshis) / 100000000; // Convert satoshis to BTC
    
    // Get BTC price in USD
    const priceResponse = await fetch('https://blockchain.info/ticker');
    const priceData = await priceResponse.json();
    const btcPriceUsd = priceData.USD.last;
    
    return {
      balance: balanceBTC.toFixed(8),
      balanceUsd: balanceBTC * btcPriceUsd,
      symbol: 'BTC',
      address
    };
  } catch (error) {
    console.error('Error fetching Bitcoin balance:', error);
    return {
      balance: '0',
      balanceUsd: 0,
      symbol: 'BTC',
      address
    };
  }
}

/**
 * Fetch Ethereum balance from Etherscan API
 */
export async function getEthereumBalance(address: string, apiKey: string): Promise<BalanceResult> {
  try {
    // Get ETH balance
    const balanceUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    const response = await fetch(balanceUrl);
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message}`);
    }
    
    const balanceWei = data.result;
    // Use safe BigInt conversion to avoid overflow
    const balanceETH = weiToEth(balanceWei);
    const balanceETHNum = parseFloat(balanceETH);
    
    // Get ETH price in USD
    const priceUrl = 'https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + apiKey;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    const ethPriceUsd = parseFloat(priceData.result.ethusd);
    
    return {
      balance: parseFloat(balanceETH).toFixed(8),
      balanceUsd: balanceETHNum * ethPriceUsd,
      symbol: 'ETH',
      address
    };
  } catch (error) {
    console.error('Error fetching Ethereum balance:', error);
    return {
      balance: '0',
      balanceUsd: 0,
      symbol: 'ETH',
      address
    };
  }
}

/**
 * Fetch Solana balance from Solana RPC
 */
export async function getSolanaBalance(address: string): Promise<BalanceResult> {
  try {
    // Use public Solana RPC endpoint
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Solana RPC error: ${data.error.message}`);
    }
    
    const balanceLamports = data.result.value;
    const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL
    
    // Get SOL price from CoinGecko
    const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const priceData = await priceResponse.json();
    const solPriceUsd = priceData.solana.usd;
    
    return {
      balance: balanceSOL.toFixed(8),
      balanceUsd: balanceSOL * solPriceUsd,
      symbol: 'SOL',
      address
    };
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    return {
      balance: '0',
      balanceUsd: 0,
      symbol: 'SOL',
      address
    };
  }
}

/**
 * Fetch Bitcoin transaction history from blockchain.info API
 */
export async function getBitcoinTransactions(address: string): Promise<Transaction[]> {
  try {
    // Fetch current blockchain height
    const blockHeightResponse = await fetch('https://blockchain.info/q/getblockcount');
    
    if (!blockHeightResponse.ok) {
      throw new Error(`Failed to fetch blockchain height: ${blockHeightResponse.statusText}`);
    }
    
    const currentHeight = parseInt(await blockHeightResponse.text());
    
    // Fetch transaction data
    const response = await fetch(`https://blockchain.info/rawaddr/${address}?limit=50`);
    
    if (!response.ok) {
      throw new Error(`Bitcoin API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.txs.map((tx: any) => {
      // Calculate total inputs and outputs involving this address
      const inputsFromAddress = tx.inputs
        .filter((input: any) => input.prev_out?.addr === address)
        .reduce((sum: number, input: any) => sum + (input.prev_out?.value || 0), 0);
      
      const outputsToAddress = tx.out
        .filter((output: any) => output.addr === address)
        .reduce((sum: number, output: any) => sum + (output.value || 0), 0);
      
      // Determine direction: if this address appears in inputs, it's a send; otherwise it's a receive
      const isSent = inputsFromAddress > 0;
      
      let toAddress = 'Unknown';
      let fromAddress = 'Unknown';
      let value = 0;
      
      if (isSent) {
        // This address is sending
        // Value = sum of outputs to OTHER addresses (excludes change back to this address)
        // Note: This may include change to other wallet-owned addresses we don't track
        const externalOutputs = tx.out.filter((output: any) => output.addr !== address);
        value = externalOutputs.reduce((sum: number, output: any) => sum + (output.value || 0), 0);
        fromAddress = address;
        // Find first non-change output (heuristic: largest output or first one not back to sender)
        toAddress = externalOutputs
          .sort((a: any, b: any) => b.value - a.value)[0]?.addr || 'Unknown';
      } else {
        // This address is receiving
        value = outputsToAddress;
        toAddress = address;
        fromAddress = tx.inputs[0]?.prev_out?.addr || 'Unknown';
      }
      
      // Calculate confirmations correctly: current height - transaction block height + 1
      // Use Math.max to ensure we never return negative confirmations
      const confirmations = tx.block_height 
        ? Math.max(0, currentHeight - tx.block_height + 1)
        : 0;
      
      return {
        hash: tx.hash,
        from: fromAddress,
        to: toAddress,
        value: (value / 100000000).toFixed(8) + ' BTC',
        timestamp: tx.time * 1000,
        confirmations,
        status: confirmations > 0 ? 'confirmed' : 'pending' as const,
        blockNumber: tx.block_height
      };
    });
  } catch (error) {
    console.error('Error fetching Bitcoin transactions:', error);
    return [];
  }
}

/**
 * Fetch Ethereum transaction history from Etherscan API
 */
export async function getEthereumTransactions(address: string, apiKey: string): Promise<Transaction[]> {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message}`);
    }
    
    return data.result.map((tx: any) => {
      // Use safe BigInt conversion to avoid overflow
      const valueETH = weiToEth(tx.value || '0');
      const gasUsed = BigInt(tx.gasUsed || '0');
      const gasPrice = BigInt(tx.gasPrice || '0');
      const feeWei = gasUsed * gasPrice;
      const feeETH = weiToEth(feeWei);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: parseFloat(valueETH).toFixed(8) + ' ETH',
        timestamp: parseInt(tx.timeStamp) * 1000,
        confirmations: parseInt(tx.confirmations),
        status: tx.txreceipt_status === '1' ? 'confirmed' : 'failed' as const,
        fee: parseFloat(feeETH).toFixed(8) + ' ETH',
        blockNumber: parseInt(tx.blockNumber)
      };
    });
  } catch (error) {
    console.error('Error fetching Ethereum transactions:', error);
    return [];
  }
}

/**
 * Fetch Solana transaction history from Solana RPC
 */
export async function getSolanaTransactions(address: string): Promise<Transaction[]> {
  try {
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit: 50 }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Solana RPC error: ${data.error.message}`);
    }
    
    const signatures = data.result || [];
    
    // Fetch detailed transaction info for each signature
    const transactions = await Promise.all(
      signatures.slice(0, 20).map(async (sig: any) => {
        try {
          const txResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [sig.signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }]
            })
          });
          
          const txData = await txResponse.json();
          const tx = txData.result;
          
          if (!tx || !tx.meta || !tx.transaction) {
            return null;
          }
          
          // Find the user's account index in accountKeys
          const accountKeys = tx.transaction.message.accountKeys || [];
          const userAccountIndex = accountKeys.findIndex((key: string) => key === address);
          
          if (userAccountIndex === -1) {
            return null; // User not involved in this transaction
          }
          
          // Get balance change for the user's account
          const preBalance = (tx.meta.preBalances[userAccountIndex] || 0) / 1e9;
          const postBalance = (tx.meta.postBalances[userAccountIndex] || 0) / 1e9;
          const balanceChange = postBalance - preBalance;
          const value = Math.abs(balanceChange);
          
          // Determine transaction direction based on balance change
          const isReceived = balanceChange > 0;
          
          // Find the counterparty (first account that's not the user)
          const counterpartyIndex = isReceived ? 0 : 1;
          const counterparty = accountKeys[counterpartyIndex] !== address
            ? accountKeys[counterpartyIndex]
            : accountKeys[counterpartyIndex === 0 ? 1 : 0];
          
          return {
            hash: sig.signature,
            from: isReceived ? (counterparty || 'Unknown') : address,
            to: isReceived ? address : (counterparty || 'Unknown'),
            value: value.toFixed(8) + ' SOL',
            timestamp: (sig.blockTime || 0) * 1000,
            confirmations: sig.confirmationStatus === 'finalized' ? 32 : 0,
            status: sig.err ? 'failed' : 'confirmed' as const,
            fee: (tx.meta.fee / 1e9).toFixed(8) + ' SOL',
            blockNumber: sig.slot
          };
        } catch (error) {
          return null;
        }
      })
    );
    
    return transactions.filter((tx): tx is Transaction => tx !== null);
  } catch (error) {
    console.error('Error fetching Solana transactions:', error);
    return [];
  }
}

export type { BalanceResult, Transaction };
