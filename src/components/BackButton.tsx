
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";

interface BackButtonProps {
  className?: string;
}

export const BackButton = ({ className }: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBack = () => {
    // Prevent navigation loops back to /account when already on that page
    if (location.pathname === "/account") {
      navigate("/");
    } else {
      navigate(-1);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      className={`flex items-center gap-2 hover:bg-gray-100 ${className || ""}`}
      onClick={handleBack}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </Button>
  );
};
