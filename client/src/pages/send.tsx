import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
import type { Wallet, Transaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Extend transaction schema with validation
const sendSchema = insertTransactionSchema.extend({
  toAddress: z.string().min(26, "Invalid Bitcoin address"),
  amount: z.number().min(1, "Amount must be at least 1 satoshi"),
});

type SendFormData = z.infer<typeof sendSchema>;

export default function SendPage() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  // Query wallet with proper typing
  const { data: wallet, isLoading: isLoadingWallet } = useQuery<Wallet | null>({
    queryKey: ["/api/wallet/primary"],
    retry: false,
  });

  const form = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      amount: 0,
      toAddress: "",
    },
  });

  async function onSubmit(data: SendFormData) {
    if (!wallet) return;

    setIsSending(true);
    try {
      const transaction: Transaction = await apiRequest("POST", "/api/transaction", {
        ...data,
        fromAddress: wallet.address,
        timestamp: new Date(),
        confirmed: false,
      }).then(r => r.json());

      toast({
        title: "Transaction sent!",
        description: `Sent ${data.amount} satoshis to ${data.toAddress}`,
      });

      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to send transaction",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSending(false);
    }
  }

  if (isLoadingWallet) {
    return (
      <div className="container max-w-xl mx-auto p-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container max-w-xl mx-auto p-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>Could not load wallet. Please try refreshing the page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-xl mx-auto p-4">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Send Bitcoin</h2>
        <p className="text-sm text-gray-500 mb-4">
          Available balance: {wallet.balance} satoshis
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Recipient Address
              </label>
              <Input
                {...form.register("toAddress")}
                placeholder="Enter Bitcoin address"
              />
              {form.formState.errors.toAddress && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.toAddress.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Amount (in satoshis)
              </label>
              <Input
                type="number"
                {...form.register("amount", { valueAsNumber: true })}
                placeholder="Enter amount in satoshis"
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSending}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Bitcoin
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}