import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Lock, Globe, Shield, Key } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import AddMerchantDialog from '@/components/admin/AddMerchantDialog';
import AddStoreDialog from '@/components/admin/AddStoreDialog';

export default function AccountManagementPage() {
  const { user } = useSupabaseAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [betaFeatures, setBetaFeatures] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your Super Admin profile and global platform preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-blue-500" /> Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input defaultValue="System Administrator" />
              </div>
              <div className="space-y-1">
                <Label>Email Address</Label>
                <Input defaultValue={user?.email || "admin@maxora.com"} disabled />
              </div>
              <Button className="w-full">Update Profile</Button>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-green-500" /> Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Auth</Label>
                  <p className="text-xs text-gray-500">Require 2FA on login</p>
                </div>
                <Switch checked={is2FAEnabled} onCheckedChange={setIs2FAEnabled} />
              </div>
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Lock className="h-4 w-4" /> Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-purple-500" /> Global Platform Defaults</CardTitle>
              <CardDescription>These settings affect all new merchants on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Default Currency</Label>
                  <Input defaultValue="INR (₹)" />
                </div>
                <div className="space-y-1">
                  <Label>System Timezone</Label>
                  <Input defaultValue="Asia/Kolkata" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Support Email Contact</Label>
                <Input defaultValue="support@maxora.com" />
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-purple-600 dark:text-purple-400">Enable Beta Features</Label>
                    <p className="text-xs text-gray-500">Allow merchants to opt-in to experimental modules.</p>
                  </div>
                  <Switch checked={betaFeatures} onCheckedChange={setBetaFeatures} />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button>Save Platform Settings</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5 text-orange-500" /> API Keys</CardTitle>
              <CardDescription>Manage keys for external integrations (SMS, Email, ERP).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-medium">Twilio SMS Gateway</p>
                    <p className="text-xs text-gray-500 text-mono">sk_live_5893...f9a2</p>
                  </div>
                  <Button variant="outline" size="sm">Revoke</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-medium">SendGrid Mail</p>
                    <p className="text-xs text-gray-500 text-mono">sg_prod_9921...c1b5</p>
                  </div>
                  <Button variant="outline" size="sm">Revoke</Button>
                </div>
                <Button variant="outline" className="w-full border-dashed border-2">
                  + Generate New API Key
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-blue-500" /> Quick Account Creation</CardTitle>
              <CardDescription>Rapidly create new Owner or Store accounts with OTP verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AddMerchantDialog>
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 border-dashed border-2 hover:border-primary hover:text-primary transition-colors">
                    <User className="h-6 w-6" />
                    <span>Create Owner Account</span>
                  </Button>
                </AddMerchantDialog>

                <AddStoreDialog>
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 border-dashed border-2 hover:border-primary hover:text-primary transition-colors">
                    <Globe className="h-6 w-6" />
                    <span>Create Store Account</span>
                  </Button>
                </AddStoreDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
