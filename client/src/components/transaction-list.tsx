import { format } from "date-fns";
import { type Transaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  walletAddress: string;
}

export function TransactionList({ transactions, walletAddress }: TransactionListProps) {
  return (
    <Card className="border-none shadow-lg" style={{ backgroundColor: 'white' }}>
      <CardHeader className="pb-2">
        <CardTitle style={{ color: 'var(--color-heading)' }}>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {transactions.length === 0 ? (
          <div className="text-center py-10" style={{ color: 'var(--color-accent)' }}>
            <p className="text-lg">No transactions yet</p>
            <p className="text-sm mt-2 opacity-80">Your transaction history will appear here</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isSent = tx.fromAddress === walletAddress;
            const amountInBTC = tx.amount / 100000000;
            
            return (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg transition-all hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${isSent ? "bg-red-100" : "bg-green-100"}`}>
                    {isSent ? (
                      <ArrowUpRight className="h-5 w-5" style={{ color: '#FF3B30' }} />
                    ) : (
                      <ArrowDownLeft className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-base" style={{ color: 'var(--color-heading)' }}>
                      {isSent ? "Sent to" : "Received from"}
                    </p>
                    <code className="text-sm font-mono opacity-70 break-all" style={{ color: 'var(--color-accent)' }}>
                      {isSent ? tx.toAddress : tx.fromAddress}
                    </code>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${isSent ? "text-red-500" : "success-text"}`}>
                    {isSent ? "-" : "+"} ₿ {amountInBTC.toFixed(8)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-sm opacity-70" style={{ color: 'var(--color-accent)' }}>
                    {tx.confirmed ? (
                      format(new Date(tx.timestamp), "MMM d, yyyy • h:mm a")
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Pending confirmation</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
