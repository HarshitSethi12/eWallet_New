import React from "react";
import { Switch, Route, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AdminSessions from "@/pages/admin-sessions";
import Dashboard from "@/pages/dashboard";

function Navigation() {
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  
  // Debug log to see what's happening
  console.log('Navigation - User:', user);
  console.log('Navigation - isAuthenticated:', isAuthenticated);

  return (
    <nav className="border-b" style={{ backgroundColor: 'var(--color-nav)' }}>
      <div className="container max-w-5xl mx-auto px-3 py-3 sm:p-4 flex items-center text-white">
        {/* Left spacer for balance when user is authenticated */}
        <div className="flex-1">
          {isAuthenticated && user && (
            <div className="w-full flex justify-start">
              {/* Empty div to balance the right side */}
            </div>
          )}
        </div>

        {/* Centered BitWallet title */}
        <div className="flex items-center justify-center">
          <Link href="/">
            <Button variant="link" className="text-2xl sm:text-3xl hover:text-white/90 flex items-center py-1 sm:py-2">
              <span className="flex items-end">
                <span 
                  className="font-bold" 
                  style={{ 
                    fontFamily: "'Poppins', sans-serif", 
                    letterSpacing: "-0.01em",
                    paddingRight: "2px",
                    color: "#F7F3E9"
                  }}
                >
                  Bit
                </span>
                <span 
                  className="font-bold"
                  style={{ 
                    fontFamily: "'Poppins', sans-serif", 
                    letterSpacing: "-0.01em",
                    color: "#A0826D"
                  }}
                >
                  Wallet
                </span>
              </span>
            </Button>
          </Link>
        </div>

        {/* Right side - User Profile and Sign Out */}
        <div className="flex-1 flex justify-end">
          {isAuthenticated && user && (
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg bg-orange-500 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {user.provider === 'metamask' ? 'MM' : user.name?.[0] || 'U'}
                  </span>
                </div>
              )}
              <Button 
                size="sm" 
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white px-2 py-1 h-8 text-xs"
                onClick={logout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-3 w-3 mr-1" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin/sessions" component={AdminSessions} />
      <Route path="/send" component={Home} />
      <Route path="/receive" component={Home} />
      <Route path="/signup" component={() => <div>Sign Up Page</div>} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ backgroundColor: 'var(--color-footer)' }}>
      <div className="container max-w-5xl mx-auto px-3 py-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-center text-white">
          <div className="flex items-center">
            <span 
              className="text-lg font-medium"
              style={{ 
                fontFamily: "'Poppins', sans-serif",
                color: "#F7F3E9"
              }}
            >
              © 2025 BitWallet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-secondary)', margin: 0, padding: 0 }}>
        <Navigation />
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
        <Footer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;