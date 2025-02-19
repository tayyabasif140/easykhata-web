
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="w-full py-6 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-primary">EasyKhata</h1>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>
    </header>
  );
};
