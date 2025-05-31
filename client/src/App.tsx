import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

function Navigation() {
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();

  console.log('Navigation render:', { isAuthenticated, user }); // Debug log

  return (
    <nav className="border-b" style={{ backgroundColor: 'var(--color-accent)' }}>
      <div className="container max-w-5xl mx-auto px-3 py-3 sm:p-4 flex items-center justify-between text-white">
        <div className="flex-shrink-0">
          <Link href="/">
            <Button variant="link" className="text-2xl sm:text-3xl hover:text-white/90 flex items-center py-1 sm:py-2">
              <span className="flex items-end">
                <span 
                  className="logo-shimmer font-bold animated-gradient-text" 
                  style={{ 
                    fontFamily: "'Poppins', sans-serif", 
                    letterSpacing: "-0.01em",
                    paddingRight: "2px"
                  }}
                >
                  Bit
                </span>
                <span 
                  className="font-bold animated-gradient-text"
                  style={{ 
                    fontFamily: "'Poppins', sans-serif", 
                    letterSpacing: "-0.01em"
                  }}
                >
                  Wallet
                </span>
              </span>
            </Button>
          </Link>
        </div>
        
        <div className="flex-shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full border-2 border-white/20"
                />
                <span className="hidden sm:block font-medium text-white">
                  {user.given_name}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isLoggingOut ? "Signing out..." : "Sign Out"}
                </span>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-white/70">Not authenticated</div>
          )}
        </div>
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