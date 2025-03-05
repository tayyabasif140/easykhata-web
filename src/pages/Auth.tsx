
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Preload important images
const preloadResources = () => {
  // Preload any critical assets that would otherwise delay rendering
  const imagesToPreload = ['/favicon.ico']; // Add any other critical images
  
  imagesToPreload.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthPage, setIsAuthPage] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const authCheckCompleted = useRef(false);
  const authStateMounted = useRef(false);

  // Optimize session check to prevent flickering
  useEffect(() => {
    // Start preloading resources immediately
    preloadResources();
    
    // Only perform this check once
    if (authCheckCompleted.current) return;
    
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          // User is already logged in, redirect to home
          console.log("User already logged in, redirecting to home");
          navigate('/', { replace: true });
        } else {
          // Confirm this is the auth page so we can show the UI
          setIsAuthPage(true);
        }
        
        authCheckCompleted.current = true;
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, still show the auth page to let user log in
        setIsAuthPage(true);
        authCheckCompleted.current = true;
      }
    };
    
    checkSession();
  }, [navigate]);

  // Optimize auth state change handler
  useEffect(() => {
    // Prevent multiple subscriptions
    if (authStateMounted.current) return;
    authStateMounted.current = true;
    
    // Setup auth state handler with reduced frequency
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Use more appropriate timing to prevent UI flicker
        requestAnimationFrame(() => {
          navigate('/', { replace: true });
        });
      }
    });
    
    // Cleanup subscription
    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (type: 'login' | 'signup') => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password.",
        variant: "destructive",
      });
      return;
    }
    
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
          .select('id') // Only select necessary fields
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

        // Only check if profile exists, with minimal data
        const { data: profile } = await supabase
          .from('profiles')
          .select('id') // Only select necessary fields
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

  // Show loading state - optimized to avoid layout shift
  if (!isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 transition-opacity duration-300">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 transition-opacity duration-300">
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
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-4 pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Sign In'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleAuth('signup')}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
