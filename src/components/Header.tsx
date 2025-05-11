
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ModeToggle } from "./mode-toggle";
import { Settings } from "lucide-react";

const Header = () => {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
        fetchUserAvatar(data.session.user.id);
      }
    }

    getSession();
  }, []);

  async function fetchUserAvatar(userId: string) {
    try {
      setAvatarLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching avatar:", error);
      } else if (data?.avatar_url) {
        // Add a cache-busting timestamp to the avatar URL
        const timestamp = new Date().getTime();
        let url = data.avatar_url;
        
        // If it's a relative path, construct the full URL
        if (!url.startsWith('http') && !url.startsWith('data:')) {
          url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${url}`;
        }
        
        // Add the timestamp parameter to prevent caching
        const finalUrl = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
        setAvatarUrl(finalUrl);
        console.log("Set avatar URL to:", finalUrl);
      }
    } catch (err) {
      console.error("Failed to fetch avatar:", err);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  return (
    <header className="w-full py-4 border-b border-border/40 bg-background sticky top-0 z-10">
      <div className="container flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold tracking-tight">EzKhata</h2>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <ModeToggle />
              <Link to="/account">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/account">
                <Avatar className="cursor-pointer">
                  {avatarUrl ? (
                    <AvatarImage 
                      src={avatarUrl} 
                      alt="User avatar" 
                      loading="eager"
                      fetchPriority="high"
                    />
                  ) : (
                    <AvatarFallback>
                      {avatarLoading ? "..." : user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Link>
            </div>
          ) : (
            <Link to="/auth">
              <Button>Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
