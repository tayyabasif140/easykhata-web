
import Header from "@/components/Header";
import { UserPlus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AllCustomers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      return data;
    }
  });

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Customer deleted successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Customers</h1>
          </div>
          <CreateCustomerDialog />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            {customers?.length ? (
              <div className="space-y-4">
                {customers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="py-4 px-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div 
                        className="cursor-pointer flex-1" 
                        onClick={() => navigate(`/customer/${customer.id}`)}
                      >
                        <h3 className="font-medium text-lg">{customer.name}</h3>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                        {customer.company && (
                          <p className="text-sm text-gray-500">{customer.company}</p>
                        )}
                        {customer.phone && (
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="text-right flex-1 sm:flex-none">
                          <p className="text-sm font-medium">Total Outstanding</p>
                          <p className="text-sm text-red-600">
                            Rs.{customer.total_unpaid?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No customers yet</h3>
                <p className="text-gray-600 mb-6">Start by adding your first customer</p>
                <CreateCustomerDialog />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AllCustomers;
