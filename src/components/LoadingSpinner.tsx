
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner = ({
  size = 'md',
  fullScreen = false,
  message = 'Loading...'
}: LoadingSpinnerProps) => {
  const sizeClass = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClass = fullScreen 
    ? "fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
    : "flex flex-col items-center justify-center p-6";

  return (
    <div className={containerClass}>
      <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100 flex flex-col items-center">
        <Loader2 className={`${sizeClass[size]} text-primary animate-spin`} />
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        <div className="mt-2 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '70%' }}></div>
        </div>
      </div>
    </div>
  );
};
