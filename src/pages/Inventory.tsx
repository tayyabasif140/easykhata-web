
import React from "react";
import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, AlertTriangle } from "lucide-react";

const Inventory = () => {
  const { toast } = useToast();
  const LOW_STOCK_THRESHOLD = 5;

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('quantity', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const checkLowStock = (quantity: number) => {
    if (quantity <= LOW_STOCK_THRESHOLD) {
      toast({
        title: "Low Stock Alert",
        description: "Some products are running low on stock!",
        variant: "destructive",
      });
    }
  };

  // Check for low stock on initial load
  React.useEffect(() => {
    inventory?.forEach(item => checkLowStock(item.quantity));
  }, [inventory]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <Button>Add Product</Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {inventory?.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl shadow flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">Rs.{item.price.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">In Stock</p>
                  <p className={`font-semibold ${item.quantity <= LOW_STOCK_THRESHOLD ? 'text-red-600' : 'text-green-600'}`}>
                    {item.quantity}
                    {item.quantity <= LOW_STOCK_THRESHOLD && (
                      <AlertTriangle className="w-4 h-4 inline ml-2 text-red-600" />
                    )}
                  </p>
                </div>
                <Button variant="outline">Update Stock</Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Inventory;
