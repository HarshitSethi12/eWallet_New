import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@shared/schema";

interface TransactionListProps {
  transactions: Transaction[];
  walletAddress: string;
}

export function TransactionList({ transactions, walletAddress }: TransactionListProps) {
  const SATS_PER_BTC = 100000000;

  // Mock transactions if none provided
  const mockTransactions = transactions.length === 0 ? [
    {
      id: "1",
      hash: "abc123...",
      fromAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      toAddress: walletAddress,
      amount: 50000000, // 0.5 BTC in satoshis
      timestamp: new Date().toISOString(),
      confirmations: 6,
      fee: 1000
    },
    {
      id: "2", 
      hash: "def456...",
      fromAddress: walletAddress,
      toAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      amount: 25000000, // 0.25 BTC in satoshis
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      confirmations: 12,
      fee: 800
    }
  ] : transactions;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle style={{ color: 'var(--color-heading)' }}>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {mockTransactions.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No transactions found</p>
        ) : (
          mockTransactions.map((tx) => {
            const isSent = tx.fromAddress === walletAddress;
            const amountInBTC = tx.amount / SATS_PER_BTC;

            return (
              <div key={tx.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isSent ? 'bg-red-100' : 'bg-green-100'}`}>
                    {isSent ? (
                      <ArrowUpRight className={`h-4 w-4 ${isSent ? 'text-red-600' : 'text-green-600'}`} />
                    ) : (
                      <ArrowDownLeft className={`h-4 w-4 ${isSent ? 'text-red-600' : 'text-green-600'}`} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-heading)' }}>
                      {isSent ? 'Sent' : 'Received'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isSent ? `To: ${tx.toAddress.slice(0, 10)}...` : `From: ${tx.fromAddress.slice(0, 10)}...`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                    {isSent ? '-' : '+'}{amountInBTC.toFixed(8)} BTC
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}