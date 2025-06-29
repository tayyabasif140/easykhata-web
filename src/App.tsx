
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import AllInvoices from "@/pages/AllInvoices";
import Estimates from "@/pages/Estimates";
import AllCustomers from "@/pages/AllCustomers";
import CustomerDetails from "@/pages/CustomerDetails";
import Inventory from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import Account from "@/pages/Account";
import TaxManagement from "@/pages/TaxManagement";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route 
            path="/auth" 
            element={isAuthenticated ? <Navigate to="/" /> : <Auth />} 
          />
          <Route
            path="/"
            element={isAuthenticated ? <Index /> : <Navigate to="/auth" />}
          />
          <Route
            path="/invoices"
            element={isAuthenticated ? <AllInvoices /> : <Navigate to="/auth" />}
          />
          <Route
            path="/estimates"
            element={isAuthenticated ? <Estimates /> : <Navigate to="/auth" />}
          />
          <Route
            path="/customers"
            element={isAuthenticated ? <AllCustomers /> : <Navigate to="/auth" />}
          />
          <Route
            path="/customers/:id"
            element={isAuthenticated ? <CustomerDetails /> : <Navigate to="/auth" />}
          />
          <Route
            path="/inventory"
            element={isAuthenticated ? <Inventory /> : <Navigate to="/auth" />}
          />
          <Route
            path="/reports"
            element={isAuthenticated ? <Reports /> : <Navigate to="/auth" />}
          />
          <Route
            path="/account"
            element={isAuthenticated ? <Account /> : <Navigate to="/auth" />}
          />
          <Route
            path="/tax-management"
            element={isAuthenticated ? <TaxManagement /> : <Navigate to="/auth" />}
          />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
