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
  const [selectedTab, setSelectedTab] = useState("templates");
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
                  <TabsList className="grid grid-cols-3 gap-4 mb-4">
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="taxes">Taxes</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                  </TabsList>

                  <TabsContent value="templates">
                    <Card>
                      <CardHeader>
                        <CardTitle>Invoice Templates</CardTitle>
                        <CardDescription>Choose your preferred invoice template</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {['classic', 'modern', 'professional'].map((template) => (
                            <div
                              key={template}
                              className={`p-4 rounded-lg border cursor-pointer ${
                                businessDetails?.invoice_template === template
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-gray-400'
                              }`}
                              onClick={() => updateBusinessDetails({ invoice_template: template })}
                            >
                              <h3 className="font-medium capitalize">{template}</h3>
                              <p className="text-sm text-gray-600">
                                {template === 'classic' && 'Traditional and clean design'}
                                {template === 'modern' && 'Contemporary and sleek layout'}
                                {template === 'professional' && 'Formal and polished appearance'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="taxes">
                    <Card>
                      <CardHeader>
                        <CardTitle>Tax Configuration</CardTitle>
                        <CardDescription>Manage your tax rates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(businessDetails?.tax_configuration || []).map((tax: any, index: number) => (
                            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                              <div className="flex-1">
                                <Label>Name</Label>
                                <Input 
                                  value={tax.name} 
                                  onChange={(e) => {
                                    const newTaxes = [...(businessDetails?.tax_configuration || [])];
                                    newTaxes[index].name = e.target.value;
                                    updateBusinessDetails({ tax_configuration: newTaxes });
                                  }}
                                />
                              </div>
                              <div className="w-24">
                                <Label>Rate (%)</Label>
                                <Input 
                                  type="number" 
                                  value={tax.rate} 
                                  onChange={(e) => {
                                    const newTaxes = [...(businessDetails?.tax_configuration || [])];
                                    newTaxes[index].rate = parseFloat(e.target.value);
                                    updateBusinessDetails({ tax_configuration: newTaxes });
                                  }}
                                />
                              </div>
                              <div className="flex flex-col justify-center">
                                <Label>Enabled</Label>
                                <Switch 
                                  checked={tax.enabled}
                                  onCheckedChange={(checked) => {
                                    const newTaxes = [...(businessDetails?.tax_configuration || [])];
                                    newTaxes[index].enabled = checked;
                                    updateBusinessDetails({ tax_configuration: newTaxes });
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => {
                              const newTaxes = [
                                ...(businessDetails?.tax_configuration || []),
                                { name: '', rate: 0, enabled: true }
                              ];
                              updateBusinessDetails({ tax_configuration: newTaxes });
                            }}
                          >
                            Add Tax
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
