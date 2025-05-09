import { UserButton } from "@clerk/nextjs";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { siteConfig } from "@/config/site";
import { ModeToggle } from "./mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Header() {
  const { user } = useUser();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBusinessDetails() {
      if (user && user.id) {
        const { data, error } = await supabase
          .from('business_details')
          .select('business_name, business_logo_url')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error("Error fetching business details:", error);
        } else if (data) {
          setBusinessName(data.business_name);
          setLogoUrl(data.business_logo_url);
        }
      }
    }

    fetchBusinessDetails();
  }, [user]);

  return (
    <div className="w-full py-4 border-b border-border/40 bg-background">
      <div className="container flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Replace user image and business name with EzKhata */}
          <h2 className="text-xl font-bold tracking-tight">EzKhata</h2>
        </div>

        <nav className="flex items-center space-x-4">
          <MainNav items={siteConfig.mainNav} />
          <Search />
        </nav>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <ModeToggle />
          <MobileSidebar isPro={false} apiLimitCount={0} />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </div>
  );
}
