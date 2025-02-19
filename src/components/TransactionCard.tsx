
import { ArrowDown, ArrowUp } from "lucide-react";

interface TransactionCardProps {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
}

export const TransactionCard = ({
  type,
  amount,
  description,
  date,
}: TransactionCardProps) => {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${
              type === "income"
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {type === "income" ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{description}</p>
            <p className="text-sm text-gray-500">{date}</p>
          </div>
        </div>
        <p
          className={`font-semibold ${
            type === "income" ? "text-green-600" : "text-red-600"
          }`}
        >
          {type === "income" ? "+" : "-"} Rs.{amount.toLocaleString()}
        </p>
      </div>
    </div>
  );
};
