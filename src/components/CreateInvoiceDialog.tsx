
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CreateInvoiceDialog() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/invoice/create');
  };

  return (
    <Button 
      className="gap-2" 
      data-create-invoice 
      onClick={handleClick}
    >
      <Plus className="w-4 h-4" />
      Create Invoice
    </Button>
  );
}
