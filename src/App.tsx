
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, checkAndRefreshSession } from "@/integrations/supabase/client";
import { Suspense, lazy, useEffect, useState } from "react";
import { toast } from "./hooks/use-toast";
import { LoadingSpinner } from "./components/LoadingSpinner";

// Lazy load components that aren't needed immediately
const Auth = lazy(() => import("./pages/Auth"));
const SetupWizard = lazy(() => import("./components/SetupWizard"));
const Index = lazy(() => import("./pages/Index"));
const Account = lazy(() => import("./pages/Account"));
const CustomerDetails = lazy(() => import("./pages/CustomerDetails"));
const Reports = lazy(() => import("./pages/Reports"));
const Inventory = lazy(() => import("./pages/Inventory"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Create QueryClient with better performance options - moved outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: import.meta.env.PROD,
      refetchOnReconnect: true,
      refetchOnMount: true,
      meta: {
        errorHandler: (error) => {
          console.error("Query error:", error);
          toast({
            title: "Data loading error",
            description: "Please try refreshing the page or sign in again",
            variant: "destructive"
          });
        }
      }
    }
  }
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Optimize initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAndRefreshSession();
      } catch (err) {
        console.error("Failed to initialize session:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        // Use a cached session check when possible
        await checkAndRefreshSession();
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!data.session) throw new Error("No active session");
        
        return data.session;
      } catch (err) {
        console.error("Session fetch error:", err);
        throw err;
      }
    },
    retry: 1,
    enabled: !isInitializing,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Optimize auth state change handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        refetch();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  useEffect(() => {
    if (error) {
      console.error("Session error in PrivateRoute:", error);
      toast({
        title: "Authentication error",
        description: "Please sign in again",
        variant: "destructive"
      });
    }
  }, [error]);

  if (isInitializing || isLoading) {
    return <LoadingSpinner fullScreen message="Loading your account..." />;
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

// Optimize main app render - separate component to avoid React hooks errors
const AppContent = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingSpinner fullScreen message="Loading application..." />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/setup" element={
          <PrivateRoute>
            <SetupWizard />
          </PrivateRoute>
        } />
        <Route path="/" element={
          <PrivateRoute>
            <Index />
          </PrivateRoute>
        } />
        <Route path="/account" element={
          <PrivateRoute>
            <Account />
          </PrivateRoute>
        } />
        <Route path="/customer/:id" element={
          <PrivateRoute>
            <CustomerDetails />
          </PrivateRoute>
        } />
        <Route path="/reports" element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        } />
        <Route path="/inventory" element={
          <PrivateRoute>
            <Inventory />
          </PrivateRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

// Main App component 
const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
