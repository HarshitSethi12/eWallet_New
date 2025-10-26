
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminDatabasePage() {
  const { data: emailWallets, isLoading: isLoadingWallets } = useQuery({
    queryKey: ["/api/admin/email-wallets"],
  });

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["/api/admin/sessions"],
  });

  const { data: metamaskUsers, isLoading: isLoadingMetamask } = useQuery({
    queryKey: ["/api/admin/metamask-users"],
  });

  if (isLoadingWallets || isLoadingSessions || isLoadingMetamask) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Database Admin Panel</h1>
        <p className="text-muted-foreground">View all records stored in your database</p>
      </div>

      <Tabs defaultValue="email-wallets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email-wallets">
            Email Wallets ({emailWallets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Sessions ({sessions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="metamask">
            MetaMask Users ({metamaskUsers?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email-wallets">
          <Card>
            <CardHeader>
              <CardTitle>Email Wallets</CardTitle>
              <CardDescription>
                All wallets created via email authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailWallets?.map((wallet: any) => (
                      <TableRow key={wallet.id}>
                        <TableCell className="font-mono">{wallet.id}</TableCell>
                        <TableCell>{wallet.email}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {wallet.walletAddress.slice(0, 10)}...{wallet.walletAddress.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {new Date(wallet.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {wallet.lastLogin ? new Date(wallet.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(!emailWallets || emailWallets.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No email wallets found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>User Sessions</CardTitle>
              <CardDescription>
                All login sessions tracked in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Email/Phone</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((session: any) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono">{session.id}</TableCell>
                        <TableCell>{session.email || session.phone}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {session.walletAddress ? 
                            `${session.walletAddress.slice(0, 8)}...${session.walletAddress.slice(-6)}` : 
                            'N/A'}
                        </TableCell>
                        <TableCell>{session.ipAddress}</TableCell>
                        <TableCell>
                          <Badge variant={session.isActive ? "default" : "secondary"}>
                            {session.isActive ? 'Active' : 'Ended'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(session.startTime).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(!sessions || sessions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sessions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metamask">
          <Card>
            <CardHeader>
              <CardTitle>MetaMask Users</CardTitle>
              <CardDescription>
                Users who connected via MetaMask
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>ENS Name</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metamaskUsers?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono">{user.id}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.address.slice(0, 10)}...{user.address.slice(-8)}
                        </TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell>{user.ensName || 'N/A'}</TableCell>
                        <TableCell>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {(!metamaskUsers || metamaskUsers.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No MetaMask users found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
