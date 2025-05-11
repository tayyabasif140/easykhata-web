
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
  const { setTheme, theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Wait until component is mounted to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set the system theme on first load
  useEffect(() => {
    if (isMounted) {
      // Set system theme if not already set
      if (!theme || theme === "system") {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.log("Setting initial theme based on system preference:", prefersDark ? 'dark' : 'light');
        setTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }, [isMounted, theme, setTheme]);

  // Add listener for system theme changes
  useEffect(() => {
    if (!isMounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        console.log("System theme changed to:", e.matches ? 'dark' : 'light');
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isMounted, setTheme, theme]);

  if (!isMounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9"><Sun className="h-[1.2rem] w-[1.2rem]" /></Button>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
          console.log("Setting theme to system preference:", prefersDark ? 'dark' : 'light');
          setTheme(prefersDark ? 'dark' : 'light');
        }}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
