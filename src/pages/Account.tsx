
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { PersonalInfoSettings } from "@/components/PersonalInfoSettings";
import { BusinessSettings } from "@/components/BusinessSettings";
import { AdditionalFeaturesSettings } from "@/components/AdditionalFeaturesSettings";
import { BackButton } from "@/components/BackButton";

const Account = () => {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="business">Business Settings</TabsTrigger>
            <TabsTrigger value="additional">Additional Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-6">
            <PersonalInfoSettings />
          </TabsContent>
          
          <TabsContent value="business" className="space-y-6">
            <BusinessSettings />
          </TabsContent>
          
          <TabsContent value="additional" className="space-y-6">
            <AdditionalFeaturesSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Account;
