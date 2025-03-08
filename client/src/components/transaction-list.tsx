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
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground">No transactions yet</p>
        ) : (
          transactions.map((tx) => {
            const isSent = tx.fromAddress === walletAddress;
            
            return (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSent ? (
                    <ArrowUpRight className="text-red-500" />
                  ) : (
                    <ArrowDownLeft className="text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isSent ? "Sent to" : "Received from"}
                    </p>
                    <code className="text-sm text-muted-foreground">
                      {isSent ? tx.toAddress : tx.fromAddress}
                    </code>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${isSent ? "text-red-500" : "text-green-500"}`}>
                    {isSent ? "-" : "+"} ₿ {tx.amount / 100000000}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {tx.confirmed ? (
                      format(new Date(tx.timestamp), "MMM d, yyyy")
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
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
