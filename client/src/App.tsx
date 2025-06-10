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

  return (
    <nav className="border-b" style={{ backgroundColor: 'var(--color-nav)' }}>
      <div className="container max-w-5xl mx-auto px-3 py-3 sm:p-4 flex items-center justify-between text-white">
        <div className="flex items-center flex-1 justify-center">
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


      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin/sessions" component={AdminSessions} />
      <Route path="/send" component={Home} />
      <Route path="/receive" component={Home} />
      <Route path="/signup" component={() => <div>Sign Up Page</div>} /> {/* Placeholder signup page */}
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
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-secondary)' }}>
        <Navigation />
        <main className="flex-1">
          <Router />
        </main>
        <Footer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;