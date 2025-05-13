
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

export function ModeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Wait until component is mounted to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detect system preference on first load
  useEffect(() => {
    if (isMounted) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      
      // Set theme on first load if not already set
      if (!theme || theme === "system") {
        console.log("Setting initial theme based on system preference:", systemTheme);
        setTheme(systemTheme);
      }
    }
  }, [isMounted, theme, setTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!isMounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        console.log("System theme changed to:", newTheme);
        setTheme(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isMounted, setTheme, theme]);

  if (!isMounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9"><Sun className="h-[1.2rem] w-[1.2rem]" /></Button>;
  }

  const currentTheme = resolvedTheme || theme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {currentTheme === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {
          console.log("Setting theme to light");
          setTheme("light");
        }}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          console.log("Setting theme to dark");
          setTheme("dark");
        }}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const systemTheme = prefersDark ? 'dark' : 'light';
          console.log("Setting theme to system preference:", systemTheme);
          setTheme("system");
        }}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
