
import { Bell, Settings, User } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

export const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTab, setSelectedTab] = useState("taxes");
  const [taxes, setTaxes] = useState<{ name: string; rate: number; enabled: boolean; }[]>([]);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
  });

  const { data: businessDetails, refetch: refetchBusinessDetails } = useQuery({
    queryKey: ['businessDetails'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.business_logo_url) {
        const { data: publicUrl } = supabase.storage
          .from('business_files')
          .getPublicUrl(data.business_logo_url);
        return { ...data, logoUrl: publicUrl.publicUrl };
      }
      
      return data;
    },
    enabled: !!session?.user?.id
  });

  const unreadNotifications = notifications?.filter(n => !n.read)?.length || 0;

  const updateBusinessDetails = async (updates: any) => {
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from('business_details')
      .update(updates)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error updating business details:', error);
      return;
    }

    refetchBusinessDetails();
  };

  const addNewTax = async () => {
    if (!session?.user?.id || !businessDetails) return;
    
    const currentTaxes = businessDetails.tax_configuration || [];
    const newTax = {
      name: `Tax ${currentTaxes.length + 1}`,
      rate: 0,
      enabled: true
    };
    
    const { error } = await supabase
      .from('business_details')
      .update({
        tax_configuration: [...currentTaxes, newTax]
      })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error adding tax:', error);
      return;
    }

    refetchBusinessDetails();
  };

  const updateTax = async (index: number, updates: any) => {
    if (!session?.user?.id || !businessDetails) return;
    
    const newTaxes = [...(businessDetails.tax_configuration || [])];
    newTaxes[index] = { ...newTaxes[index], ...updates };
    
    const { error } = await supabase
      .from('business_details')
      .update({
        tax_configuration: newTaxes
      })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error updating tax:', error);
      return;
    }

    refetchBusinessDetails();
  };

  const deleteTax = async (index: number) => {
    if (!session?.user?.id || !businessDetails) return;
    
    const newTaxes = (businessDetails.tax_configuration || []).filter((_, i) => i !== index);
    
    const { error } = await supabase
      .from('business_details')
      .update({
        tax_configuration: newTaxes
      })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting tax:', error);
      return;
    }

    refetchBusinessDetails();
  };

  return (
    <header className="w-full py-6 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-sm border-b border-gray-200 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-primary">EasyKhata</h1>
        </div>
        <div className="flex items-center space-x-6">
          <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
            <SheetTrigger asChild>
              <button className="relative p-2 text-gray-600 hover:text-primary transition-colors">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Notifications</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {notifications?.length === 0 ? (
                  <p className="text-sm text-gray-500">No notifications</p>
                ) : (
                  <div className="space-y-4">
                    {notifications?.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${
                          notification.read ? 'bg-white' : 'bg-primary/5'
                        }`}
                      >
                        <h3 className="font-medium">{notification.title}</h3>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <button className="p-2 text-gray-600 hover:text-primary transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[500px]">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="grid grid-cols-2 gap-4 mb-4">
                    <TabsTrigger value="taxes">Taxes</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                  </TabsList>

                  <TabsContent value="taxes">
                    <Card>
                      <CardHeader>
                        <CardTitle>Tax Configuration</CardTitle>
                        <CardDescription>Add and manage your tax rates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(businessDetails?.tax_configuration || []).map((tax: any, index: number) => (
                            <div key={index} className="flex flex-col gap-4 p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">Tax {index + 1}</h3>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteTax(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Name</Label>
                                  <Input 
                                    value={tax.name}
                                    placeholder="Enter tax name"
                                    onChange={(e) => updateTax(index, { name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Rate (%)</Label>
                                  <Input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={tax.rate}
                                    onChange={(e) => updateTax(index, { rate: parseFloat(e.target.value) })}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={tax.enabled}
                                  onCheckedChange={(checked) => updateTax(index, { enabled: checked })}
                                />
                                <Label>Enable this tax</Label>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={addNewTax}
                            className="w-full"
                          >
                            Add New Tax
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="profile">
                    <div className="space-y-4">
                      <Link to="/account" className="w-full">
                        <Button className="w-full justify-start" variant="outline">
                          Profile Settings
                        </Button>
                      </Link>
                      <Button className="w-full justify-start" variant="outline">
                        Notification Preferences
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {businessDetails?.logoUrl ? (
                <button className="w-9 h-9 rounded-full overflow-hidden">
                  <img
                    src={businessDetails.logoUrl}
                    alt="Business Logo"
                    className="w-full h-full object-cover"
                  />
                </button>
              ) : (
                <button className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/account">
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="font-medium">{session?.user?.email}</span>
                    <span className="text-xs text-gray-500">View Profile</span>
                  </div>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer" 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
