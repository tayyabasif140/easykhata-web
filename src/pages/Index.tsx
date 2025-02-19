
import { Header } from "@/components/Header";
import { TransactionCard } from "@/components/TransactionCard";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mt-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg bg-primary/5 border border-primary/10">
                <h3 className="text-lg font-semibold text-gray-900">Balance</h3>
                <p className="text-3xl font-bold text-primary mt-2">
                  Rs.73,500
                </p>
              </div>
              <div className="p-6 rounded-lg bg-secondary/5 border border-secondary/10">
                <h3 className="text-lg font-semibold text-gray-900">
                  Total Transactions
                </h3>
                <p className="text-3xl font-bold text-secondary mt-2">21</p>
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
