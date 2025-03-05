
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthPage, setIsAuthPage] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in and redirect away from auth page
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // User is already logged in, redirect to home
        navigate('/', { replace: true });
      } else {
        // Confirm this is the auth page so we can show the UI
        setIsAuthPage(true);
      }
    };
    
    checkSession();
    
    // Clean up any auth state change handlers to prevent duplicate redirects
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Wait a moment before redirecting to prevent UI flicker
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (type: 'login' | 'signup') => {
    try {
      setLoading(true);
      let result;
      
      if (type === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
        });

        if (result.error) throw result.error;

        toast({
          title: "Account created",
          description: "Please check your email to verify your account.",
        });

        // Check if user profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', result.data.user?.id)
          .single();

        if (!profile) {
          // Redirect to setup wizard if profile doesn't exist
          navigate('/setup', { replace: true });
          return;
        }

        navigate('/', { replace: true });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (result.error) throw result.error;

        // Check if user profile exists after login
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', result.data.user?.id)
          .single();

        if (!profile) {
          // Redirect to setup wizard if profile doesn't exist
          navigate('/setup', { replace: true });
          return;
        }

        navigate('/', { replace: true });
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
  };

  // Only render the auth UI when we've confirmed this is the auth page
  // and there's no active session (prevents flickering)
  if (!isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to EasyKhata</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            handleAuth('login');
          }}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-4 pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                Sign In
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleAuth('signup')}
                disabled={loading}
              >
                Create Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
