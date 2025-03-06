
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface BackButtonProps {
  className?: string;
}

export const BackButton = ({ className }: BackButtonProps) => {
  const navigate = useNavigate();
  
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 hover:bg-gray-100 ${className || ""}`}
      onClick={() => navigate(-1)}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </Button>
  );
};
