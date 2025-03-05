
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
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true,
      meta: {
        onError: (error) => {
          console.error("Query error:", error);
        }
      }
    }
  }
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      // Try to refresh the session first
      await checkAndRefreshSession();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }
      return session;
    },
    retry: 2,
    refetchOnMount: true
  });

  useEffect(() => {
    // Set up auth state change listener to refetch session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refetch();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refetch]);

  useEffect(() => {
    if (error) {
      console.error("Session error:", error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
