
import { Header } from "@/components/Header";
import { TransactionCard } from "@/components/TransactionCard";
import { FileText, ChartBar, Package, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const recentTransactions = [
    {
      type: "income" as const,
      amount: 50000,
      description: "Monthly Salary",
      date: "Today, 2:30 PM",
    },
    {
      type: "expense" as const,
      amount: 1500,
      description: "Grocery Shopping",
      date: "Yesterday, 6:45 PM",
    },
    {
      type: "income" as const,
      amount: 25000,
      description: "Freelance Payment",
      date: "2 days ago, 3:20 PM",
    },
  ];

  const totalPaidInvoices = 85000;
  const totalUnpaidInvoices = 12500;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mt-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg bg-green-50 border border-green-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Paid Invoices
                </h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  Rs.{totalPaidInvoices.toLocaleString()}
                </p>
              </div>
              <div className="p-6 rounded-lg bg-red-50 border border-red-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Unpaid Invoices
                </h3>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  Rs.{totalUnpaidInvoices.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice</h3>
              <p className="text-gray-600">Create and manage your invoices easily</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <ChartBar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Report</h3>
              <p className="text-gray-600">View detailed financial reports and analytics</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory</h3>
              <p className="text-gray-600">Track and manage your product stock</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Customer
            </Button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
                <p className="text-gray-600 mb-4">Start by adding your first customer</p>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Customer
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Recent Transactions
          </h2>
          <div className="space-y-4">
            {recentTransactions.map((transaction, index) => (
              <TransactionCard key={index} {...transaction} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
