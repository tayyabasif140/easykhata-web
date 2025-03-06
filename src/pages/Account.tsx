import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Header } from "@/components/Header";

export default function Account() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let { data, error, status } = await supabase
        .from("profiles")
        .select(`full_name, username, website, avatar_url`)
        .eq("id", userData.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setFullName(data.full_name);
        setUsername(data.username);
        setWebsite(data.website);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    username,
    website,
    fullName,
    avatarUrl,
  }: {
    username: string;
    website: string;
    fullName: string;
    avatarUrl: string;
  }) {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const updates = {
        id: userData.user.id,
        full_name: fullName,
        username,
        website,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      let { error } = await supabase.from("profiles").upsert(updates, {
        returning: "minimal", // Don't return values after inserting
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <BackButton className="mb-4" />
        <div className="space-y-6">
          <div className="bg-white shadow-md rounded-md p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                {avatarUrl ? (
                  <AvatarImage src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`} alt="Avatar" />
                ) : (
                  <AvatarFallback>{fullName?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">Profile Information</h2>
                <p className="text-gray-500">Update your profile details here.</p>
              </div>
            </div>
            <div className="mt-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const usernameInput = document.getElementById("username") as HTMLInputElement;
                  const websiteInput = document.getElementById("website") as HTMLInputElement;
                  const fullNameInput = document.getElementById("fullName") as HTMLInputElement;
                  const avatarUrlInput = document.getElementById("avatarUrl") as HTMLInputElement;

                  updateProfile({
                    username: usernameInput.value,
                    website: websiteInput.value,
                    fullName: fullNameInput.value,
                    avatarUrl: avatarUrlInput.value,
                  });
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    defaultValue={fullName || ""}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    defaultValue={username || ""}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    defaultValue={website || ""}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input
                    id="avatarUrl"
                    type="text"
                    defaultValue={avatarUrl || ""}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Updating ..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-md p-6">
            <h2 className="text-lg font-semibold">Account Actions</h2>
            <p className="text-gray-500 mt-1">Manage your account settings.</p>
            <div className="mt-6">
              <Button onClick={signOut} variant="destructive" className="w-full">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
