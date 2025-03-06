
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, checkAndRefreshSession } from "@/integrations/supabase/client";
import { Suspense, lazy, useEffect, useState } from "react";
import { toast } from "./hooks/use-toast";

// Create optimized loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="ml-4 text-lg text-gray-600">Loading...</p>
  </div>
);

// Lazy load components that aren't needed immediately
const Auth = lazy(() => import("./pages/Auth"));
const SetupWizard = lazy(() => import("./components/SetupWizard"));
const Index = lazy(() => import("./pages/Index"));
const Account = lazy(() => import("./pages/Account"));
const CustomerDetails = lazy(() => import("./pages/CustomerDetails"));
const Reports = lazy(() => import("./pages/Reports"));
const Inventory = lazy(() => import("./pages/Inventory"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Create QueryClient with better performance options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Reduced retries to prevent excessive network requests
      staleTime: 2 * 60 * 1000, // 2 minutes - increased to reduce API calls
      gcTime: 10 * 60 * 1000, // 10 minutes - increased for better caching (was cacheTime)
      refetchOnWindowFocus: import.meta.env.PROD, // Only in production
      refetchOnReconnect: true,
      refetchOnMount: true,
      // Remove the suspense property as it's not supported in this context
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
    retry: 1, // Reduced retries for faster feedback
    enabled: !isInitializing,
    refetchInterval: 10 * 60 * 1000, // Reduced frequency - 10 minutes
    refetchOnWindowFocus: false, // Disable to reduce flickering
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
    return <LoadingSpinner />;
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

// Optimize main app render
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
