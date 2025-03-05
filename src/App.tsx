
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, checkAndRefreshSession } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CustomerDetails from "./pages/CustomerDetails";
import Reports from "./pages/Reports";
import Inventory from "./pages/Inventory";
import SetupWizard from "./components/SetupWizard";
import Account from "./pages/Account";
import { useEffect, useState } from "react";
import { toast } from "./hooks/use-toast";

// Create QueryClient with better error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Increased from 1 to handle transient network errors
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: true, // Added to refresh data when connection is restored
      refetchOnMount: true, // Added to ensure fresh data on component mount
      meta: {
        onError: (error) => {
          console.error("Query error:", error);
          // Show user-friendly toast for query errors
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
  
  // First, check and refresh session before even starting the query
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
        console.log("Fetching session in PrivateRoute...");
        // Try to refresh the session first to ensure we have a valid token
        await checkAndRefreshSession();
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error in PrivateRoute:", error);
          throw error;
        }
        
        if (!data.session) {
          console.log("No active session found in PrivateRoute");
          throw new Error("No active session");
        }
        
        console.log("Valid session found in PrivateRoute");
        return data.session;
      } catch (err) {
        console.error("Session fetch error:", err);
        throw err;
      }
    },
    retry: 2,
    enabled: !isInitializing, // Only run query after initialization
    refetchInterval: 5 * 60 * 1000, // Refresh session every 5 minutes
  });

  useEffect(() => {
    // Set up auth state change listener to refetch session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log("Auth state changed in PrivateRoute:", event);
      refetch();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  useEffect(() => {
    if (error) {
      console.error("Session error in PrivateRoute:", error);
      // Show user-friendly toast for auth errors
      toast({
        title: "Authentication error",
        description: "Please sign in again",
        variant: "destructive"
      });
    }
  }, [error]);

  if (isInitializing || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg text-gray-600">Loading your account...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/setup"
            element={
              <PrivateRoute>
                <SetupWizard />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Index />
              </PrivateRoute>
            }
          />
          <Route
            path="/account"
            element={
              <PrivateRoute>
                <Account />
              </PrivateRoute>
            }
          />
          <Route
            path="/customer/:id"
            element={
              <PrivateRoute>
                <CustomerDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <Inventory />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
