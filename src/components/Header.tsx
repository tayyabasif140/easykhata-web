
import { Bell, Settings, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="w-full py-6 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-primary">EasyKhata</h1>
        </div>
        <div className="flex items-center space-x-6">
          <button className="relative p-2 text-gray-600 hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 text-gray-600 hover:text-primary transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>
    </header>
  );
};
