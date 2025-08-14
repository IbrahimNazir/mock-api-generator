import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    theme: 'system',
    emailNotifications: true,
    mockDataNotifications: false,
    apiUpdates: true,
    securityAlerts: true,
    autoSave: true,
    defaultMockCount: '10',
    defaultFakerSeed: '123',
  });

  const handleSave = () => {
    // In a real app, this would save to backend
    localStorage.setItem('app-settings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully",
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-2 mb-8">
          <SettingsIcon className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color scheme
                </p>
              </div>
              <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your account
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Mock Data Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when mock data is regenerated
                </p>
              </div>
              <Switch
                checked={settings.mockDataNotifications}
                onCheckedChange={(checked) => updateSetting('mockDataNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>API Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about API changes
                </p>
              </div>
              <Switch
                checked={settings.apiUpdates}
                onCheckedChange={(checked) => updateSetting('apiUpdates', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Important security and account alerts
                </p>
              </div>
              <Switch
                checked={settings.securityAlerts}
                onCheckedChange={(checked) => updateSetting('securityAlerts', checked)}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* API Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>API Defaults</CardTitle>
            <CardDescription>
              Set default values for new APIs and endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-save Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save changes as you work
                </p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) => updateSetting('autoSave', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Default Mock Count</Label>
                <p className="text-sm text-muted-foreground">
                  Number of mock records to generate by default
                </p>
              </div>
              <Select value={settings.defaultMockCount} onValueChange={(value) => updateSetting('defaultMockCount', value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Default Faker Seed</Label>
                <p className="text-sm text-muted-foreground">
                  Seed value for consistent fake data generation
                </p>
              </div>
              <Select value={settings.defaultFakerSeed} onValueChange={(value) => updateSetting('defaultFakerSeed', value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="123">123</SelectItem>
                  <SelectItem value="456">456</SelectItem>
                  <SelectItem value="789">789</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};