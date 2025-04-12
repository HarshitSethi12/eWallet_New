import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddressCardProps {
  address: string;
  balance: number;
}

export function AddressCard({ address, balance }: AddressCardProps) {
  const { toast } = useToast();

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "The wallet address has been copied to your clipboard",
    });
  };

  const balanceInBTC = balance / 100000000;

  return (
    <Card className="w-full border-none shadow-lg" style={{ backgroundColor: 'white' }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="text-xl" style={{ color: 'var(--color-heading)' }}>Your Wallet</span>
          <span className="text-3xl font-bold success-text">₿ {balanceInBTC.toFixed(8)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <QRCodeSVG value={address} size={200} includeMargin bgColor="#FFFFFF" fgColor="#0A3665" />
        </div>
        <div className="flex items-center gap-2 w-full">
          <code className="flex-1 p-3 rounded-lg text-sm overflow-hidden text-ellipsis font-mono" 
              style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-accent)' }}>
            {address}
          </code>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={copyAddress}
            className="rounded-lg p-3 hover:bg-primary/10"
            style={{ borderColor: 'var(--color-primary)' }}
          >
            <Copy className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
