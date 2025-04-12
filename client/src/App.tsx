import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

function Navigation() {
  return (
    <nav className="border-b" style={{ backgroundColor: 'var(--color-accent)' }}>
      <div className="container max-w-5xl mx-auto p-4 flex items-center justify-center text-white">
        <Link href="/">
          <Button variant="link" className="text-3xl hover:text-white/90 flex items-center py-2">
            <span 
              className="font-bold relative" 
              style={{ 
                fontFamily: "'Montserrat', sans-serif", 
                letterSpacing: "0.02em",
                background: "linear-gradient(90deg, #30D158 0%, #0A3665 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                padding: "0.2rem 0"
              }}
            >
              BitWallet
            </span>
          </Button>
        </Link>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/send" component={Home} />
      <Route path="/receive" component={Home} />
      <Route path="/signup" component={() => <div>Sign Up Page</div>} /> {/* Placeholder signup page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-secondary)' }}>
        <Navigation />
        <main>
          <Router />
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;