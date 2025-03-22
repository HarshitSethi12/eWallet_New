import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Send as SendIcon, QrCode } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SendPage from "@/pages/send";
import Receive from "@/pages/receive";

function Navigation() {
  return (
    <nav className="border-b bg-primary">
      <div className="container max-w-3xl mx-auto p-4 flex flex-col items-center gap-4 text-white">
        <Link href="/">
          <Button variant="link" className="text-3xl font-bold text-white hover:text-white/90">
            BitWallet
          </Button>
        </Link>

        <div className="flex gap-8">
          <Link href="/send">
            <Button variant="ghost" className="text-white hover:text-white/90">
              <SendIcon className="mr-2 h-5 w-5" />
              Send
            </Button>
          </Link>
          <Link href="/receive">
            <Button variant="ghost" className="text-white hover:text-white/90">
              <QrCode className="mr-2 h-5 w-5" />
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
      <Route path="/signup" component={() => <div>Sign Up Page</div>} /> {/* Placeholder signup page */}
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