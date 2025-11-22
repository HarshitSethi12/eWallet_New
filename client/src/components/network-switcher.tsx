import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export type NetworkType = 'BTC' | 'ETH' | 'SOL';

interface NetworkInfo {
  id: NetworkType;
  name: string;
  color: string;
  icon: string;
}

const networks: NetworkInfo[] = [
  { id: 'BTC', name: 'Bitcoin', color: '#F7931A', icon: '₿' },
  { id: 'ETH', name: 'Ethereum', color: '#627EEA', icon: 'Ξ' },
  { id: 'SOL', name: 'Solana', color: '#14F195', icon: '◎' },
];

interface NetworkSwitcherProps {
  selectedNetwork: NetworkType;
  onNetworkChange: (network: NetworkType) => void;
  address?: string;
}

export function NetworkSwitcher({ selectedNetwork, onNetworkChange, address }: NetworkSwitcherProps) {
  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto justify-between gap-2 border-2"
          style={{ borderColor: currentNetwork.color }}
          data-testid="button-network-switcher"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: currentNetwork.color }}>
              {currentNetwork.icon}
            </span>
            <span className="font-semibold">{currentNetwork.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 z-[9999]">
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => onNetworkChange(network.id)}
            className="flex items-center gap-3 cursor-pointer"
            data-testid={`menu-item-network-${network.id.toLowerCase()}`}
          >
            <span className="text-lg font-bold" style={{ color: network.color }}>
              {network.icon}
            </span>
            <div className="flex-1">
              <div className="font-semibold">{network.name}</div>
              <div className="text-xs text-muted-foreground">
                {network.id === selectedNetwork ? '✓ Active' : 'Switch to ' + network.name}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        {address && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
              Current Address
            </div>
            <div className="px-2 py-1 text-xs font-mono bg-muted rounded mx-2 mb-1 break-all">
              {address}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
