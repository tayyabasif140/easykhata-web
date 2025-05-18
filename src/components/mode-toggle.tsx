
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

export function ModeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Wait until component is mounted to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle theme change with debounce to prevent flickering
  const handleThemeChange = (newTheme: string) => {
    if (isChanging) return;
    
    setIsChanging(true);
    console.log(`Setting theme to ${newTheme}`);
    
    setTheme(newTheme);
    
    // Show feedback to user
    toast({
      title: `Theme changed to ${newTheme}`,
      duration: 2000,
    });
    
    // Prevent rapid changes
    setTimeout(() => {
      setIsChanging(false);
    }, 500);
  };

  // Simplified system preference detection
  useEffect(() => {
    if (!isMounted || isChanging) return;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Only set on first load if theme is system
    if (theme === "system") {
      const systemTheme = prefersDark ? 'dark' : 'light';
      console.log("Using system theme:", systemTheme);
      // We don't call setTheme here to avoid unnecessary re-renders
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        // The theme provider will handle this automatically
        console.log("System theme changed:", e.matches ? "dark" : "light");
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isMounted, theme, isChanging]);

  if (!isMounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9"><Sun className="h-[1.2rem] w-[1.2rem]" /></Button>;
  }

  const currentTheme = resolvedTheme || theme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isChanging}>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {currentTheme === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border-border">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}
          className="cursor-pointer">
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}
          className="cursor-pointer">
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}
          className="cursor-pointer">
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
