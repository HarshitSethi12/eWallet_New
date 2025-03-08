import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Bitcoin, Send as SendIcon, BookUser } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SendPage from "@/pages/send";
import Contacts from "@/pages/contacts";

function Navigation() {
  return (
    <nav className="border-b">
      <div className="container max-w-3xl mx-auto p-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="link" className="text-xl font-bold">
            <Bitcoin className="mr-2 h-5 w-5" />
            Bitcoin Wallet
          </Button>
        </Link>

        <div className="flex gap-4">
          <Link href="/send">
            <Button variant="ghost" size="sm">
              <SendIcon className="mr-2 h-4 w-4" />
              Send
            </Button>
          </Link>
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <BookUser className="mr-2 h-4 w-4" />
              Contacts
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
      <Route path="/contacts" component={Contacts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <main className="min-h-screen">
        <Router />
      </main>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;