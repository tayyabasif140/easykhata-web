
import { useState } from "react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoSettings } from "@/components/PersonalInfoSettings";
import { BusinessSettings } from "@/components/BusinessSettings";
import { CustomFieldsSettings } from "@/components/CustomFieldsSettings";
import { AdditionalFeaturesSettings } from "@/components/AdditionalFeaturesSettings";

const Account = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your account and business settings</p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
            <TabsTrigger value="additional">Additional Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal">
            <PersonalInfoSettings />
          </TabsContent>
          
          <TabsContent value="business">
            <BusinessSettings />
          </TabsContent>
          
          <TabsContent value="custom-fields">
            <CustomFieldsSettings />
          </TabsContent>
          
          <TabsContent value="additional">
            <AdditionalFeaturesSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Account;
