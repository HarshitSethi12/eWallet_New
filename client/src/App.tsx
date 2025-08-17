// ===== CORE IMPORTS =====
// React library for building user interfaces
import React from "react";
// Wouter for client-side routing (lightweight alternative to React Router)
import { Switch, Route, Link } from "wouter";
// React Query for server state management and caching
import { QueryClientProvider } from "@tanstack/react-query";
// Our configured query client instance
import { queryClient } from "./lib/queryClient";
// Toast notification system for user feedback
import { Toaster } from "@/components/ui/toaster";
// UI components
import { Button } from "@/components/ui/button";
// Logout icon
import { LogOut } from "lucide-react";
// Authentication hook
import { useAuth } from "@/hooks/use-auth";
// Page components
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AdminSessions from "@/pages/admin-sessions";
import Dashboard from "@/pages/dashboard";

// ===== NAVIGATION COMPONENT =====
// This component renders the top navigation bar of the application
function Navigation() {
  // ===== AUTHENTICATION STATE =====
  // Get user authentication data and functions
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  
  // ===== DEBUG LOGGING =====
  // Log authentication state for debugging purposes
  console.log('Navigation - User:', user);
  console.log('Navigation - isAuthenticated:', isAuthenticated);

  return (
    // ===== NAVIGATION CONTAINER =====
    // Main navigation bar with custom background color
    <nav className="border-b" style={{ backgroundColor: 'var(--color-nav)' }}>
      <div className="container max-w-5xl mx-auto px-3 py-3 sm:p-4 flex items-center text-white">
        
        {/* ===== LEFT SPACER SECTION ===== */}
        {/* Creates balanced spacing when user is authenticated */}
        <div className="flex-1">
          {isAuthenticated && user && (
            <div className="w-full flex justify-start">
              {/* Empty div to balance the right side layout */}
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

// ===== ROUTER COMPONENT =====
// This component handles all the page routing for the application
function Router() {
  // ===== AUTHENTICATION STATE =====
  // Get authentication status (currently not used but available for route protection)
  const { isAuthenticated } = useAuth();

  return (
    // ===== ROUTE SWITCHING =====
    // Switch component renders only the first matching route
    <Switch>
      {/* Dashboard page route - shows user's wallet dashboard */}
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Admin sessions page route - for session management */}
      <Route path="/admin/sessions" component={AdminSessions} />
      
      {/* Send and receive routes - currently redirect to Home */}
      <Route path="/send" component={Home} />
      <Route path="/receive" component={Home} />
      
      {/* Placeholder signup route */}
      <Route path="/signup" component={() => <div>Sign Up Page</div>} />
      
      {/* Home page route - main landing page */}
      <Route path="/" component={Home} />
      
      {/* Catch-all route for 404 pages */}
      <Route component={NotFound} />
    </Switch>
  );
}

// ===== FOOTER COMPONENT =====
// This component renders the footer at the bottom of every page
function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ backgroundColor: 'var(--color-footer)' }}>
      <div className="container max-w-5xl mx-auto px-3 py-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-center text-white">
          <div className="flex items-center">
            {/* ===== COPYRIGHT TEXT ===== */}
            {/* Styled copyright notice with custom font */}
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

// ===== MAIN APP COMPONENT =====
// This is the root component that wraps the entire application
function App() {
  return (
    // ===== REACT QUERY PROVIDER =====
    // Provides React Query context to all child components for data fetching
    <QueryClientProvider client={queryClient}>
      
      {/* ===== MAIN APP CONTAINER ===== */}
      {/* Full-screen container with flex layout */}
      <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-secondary)', margin: 0, padding: 0 }}>
        
        {/* ===== NAVIGATION BAR ===== */}
        {/* Top navigation that stays fixed */}
        <Navigation />
        
        {/* ===== MAIN CONTENT AREA ===== */}
        {/* Flexible content area that takes remaining space */}
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
        
        {/* ===== FOOTER ===== */}
        {/* Bottom footer that stays at bottom */}
        <Footer />
        
        {/* ===== TOAST NOTIFICATIONS ===== */}
        {/* Global toast notification system */}
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;