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
          <Button variant="link" className="text-3xl hover:text-white/90 flex items-center py-2" style={{ fontFamily: "'Roboto Mono', 'SF Mono', monospace", letterSpacing: "0.05em", fontWeight: "300" }}>
            <span className="relative" style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}>
              <span style={{ color: "#FFFFFF" }}>B<span style={{ color: "#E0F7E4" }}>i</span>t</span>
              <span style={{ color: "#9AFCB3" }}>W<span style={{ color: "#FFFFFF" }}>a</span>ll<span style={{ color: "#E0F7E4" }}>e</span>t</span>
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