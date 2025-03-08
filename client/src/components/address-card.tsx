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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Your Wallet</span>
          <span className="text-2xl font-bold">₿ {balance / 100000000}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <QRCodeSVG value={address} size={200} includeMargin />
        <div className="flex items-center gap-2 w-full">
          <code className="flex-1 p-2 bg-muted rounded text-sm overflow-hidden text-ellipsis">
            {address}
          </code>
          <Button variant="outline" size="icon" onClick={copyAddress}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
