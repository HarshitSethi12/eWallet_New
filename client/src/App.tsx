import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Bitcoin, Send as SendIcon, QrCode } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SendPage from "@/pages/send";
import Receive from "@/pages/receive";

function Navigation() {
  return (
    <nav className="border-b bg-primary">
      <div className="container max-w-3xl mx-auto p-4 flex items-center justify-between text-white">
        <Link href="/">
          <Button variant="link" className="text-xl font-bold text-white flex items-center">
            <Bitcoin className="mr-2 h-6 w-6 rotate-12 animate-pulse" />
            BitWallet
          </Button>
        </Link>

        <div className="flex gap-4">
          <Link href="/send">
            <Button variant="ghost" size="sm" className="text-white hover:text-white/90">
              <SendIcon className="mr-2 h-4 w-4" />
              Send
            </Button>
          </Link>
          <Link href="/receive">
            <Button variant="ghost" size="sm" className="text-white hover:text-white/90">
              <QrCode className="mr-2 h-4 w-4" />
              Receive
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/send" component={SendPage} />
      <Route path="/receive" component={Receive} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-primary/5">
        <Navigation />
        <main className="text-primary-foreground">
          <Router />
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;