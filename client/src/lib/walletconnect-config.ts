
import { createConfig, http } from '@wagmi/core';
import { mainnet, polygon, arbitrum, optimism } from '@wagmi/core/chains';
import { walletConnect, injected } from '@wagmi/connectors';

// Get your project ID from https://cloud.walletconnect.com
const projectId = 'YOUR_PROJECT_ID'; // Replace with your actual project ID

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism],
  connectors: [
    walletConnect({
      projectId,
      metadata: {
        name: 'BitWallet',
        description: 'Your Crypto Wallet',
        url: 'https://your-repl-url.repl.co',
        icons: ['https://your-repl-url.repl.co/icon.png']
      },
      showQrModal: true
    }),
    injected() // This supports MetaMask and other browser wallets
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  }
});
