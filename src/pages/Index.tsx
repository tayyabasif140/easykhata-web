
import { Header } from "@/components/Header";
import { FileText, ChartBar, Package, UserPlus, Download, Plus, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Index = () => {
  const totalPaidInvoices = 85000;
  const totalUnpaidInvoices = 12500;

  const salesData = [
    { month: 'Jan', sales: 4000 },
    { month: 'Feb', sales: 3000 },
    { month: 'Mar', sales: 5000 },
    { month: 'Apr', sales: 4500 },
    { month: 'May', sales: 6000 },
    { month: 'Jun', sales: 5500 },
  ];

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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Invoices</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-600 mb-4">Start by creating your first invoice</p>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-semibold text-gray-900">Rs.125,000</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stock Sold</p>
                  <p className="text-2xl font-semibold text-gray-900">250 units</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-semibold text-gray-900">Rs.12,500</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Sales Overview</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#9b87f5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
