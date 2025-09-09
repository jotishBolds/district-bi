"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Clock,
  Monitor,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
  Smartphone,
  Mail,
  MessageSquare,
  Eye,
  Users,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  applicationUpdates: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
}

interface PrivacySettings {
  profileVisibility: "public" | "private" | "department_only";
  showContactInfo: boolean;
  allowDirectMessages: boolean;
}

interface SystemPreferences {
  theme: "light" | "dark" | "system";
  language: "en" | "hi" | "ne";
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  itemsPerPage: number;
}

interface UserSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  preferences: SystemPreferences;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setHasChanges(false);
      } else {
        toast.error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Error fetching settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        // Apply theme changes only after successful save
        if (settings.preferences?.theme) {
          setTheme(settings.preferences.theme);
        }
        toast.success("Settings saved successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setHasChanges(false);
        setResetDialogOpen(false);
        toast.success("Settings reset to default");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reset settings");
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("Error resetting settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (
    section: keyof UserSettings,
    key: string,
    value: boolean | string | number
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
    setHasChanges(true);

    // Don't apply theme changes immediately - only on save
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getPrivacyIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "private":
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Settings Not Found
            </h3>
            <p className="text-gray-500 text-center">
              Unable to load your settings. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and system settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={saveSettings} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800">
              You have unsaved changes. Don&apos;t forget to save your settings.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about important updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Delivery Methods</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="emailNotifications" className="font-normal">
                      Email Notifications
                    </Label>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "emailNotifications",
                        checked
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="smsNotifications" className="font-normal">
                      SMS Notifications
                    </Label>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={settings.notifications.smsNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "smsNotifications",
                        checked
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="pushNotifications" className="font-normal">
                      Push Notifications
                    </Label>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "pushNotifications",
                        checked
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Notification Types</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="applicationUpdates" className="font-normal">
                    Application Updates
                  </Label>
                  <Switch
                    id="applicationUpdates"
                    checked={settings.notifications.applicationUpdates}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "applicationUpdates",
                        checked
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="systemAlerts" className="font-normal">
                    System Alerts
                  </Label>
                  <Switch
                    id="systemAlerts"
                    checked={settings.notifications.systemAlerts}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "systemAlerts", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketingEmails" className="font-normal">
                    Marketing Emails
                  </Label>
                  <Switch
                    id="marketingEmails"
                    checked={settings.notifications.marketingEmails}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        "notifications",
                        "marketingEmails",
                        checked
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control who can see your information and contact you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileVisibility">Profile Visibility</Label>
                <Select
                  value={settings.privacy.profileVisibility}
                  onValueChange={(
                    value: "public" | "private" | "department_only"
                  ) => updateSettings("privacy", "profileVisibility", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public - Everyone can see
                      </div>
                    </SelectItem>
                    <SelectItem value="department_only">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Department Only - Same department
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Private - Only me
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="showContactInfo" className="font-normal">
                    Show Contact Information
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your phone and email
                  </p>
                </div>
                <Switch
                  id="showContactInfo"
                  checked={settings.privacy.showContactInfo}
                  onCheckedChange={(checked) =>
                    updateSettings("privacy", "showContactInfo", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allowDirectMessages" className="font-normal">
                    Allow Direct Messages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Let colleagues send you direct messages
                  </p>
                </div>
                <Switch
                  id="allowDirectMessages"
                  checked={settings.privacy.allowDirectMessages}
                  onCheckedChange={(checked) =>
                    updateSettings("privacy", "allowDirectMessages", checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance & Display
            </CardTitle>
            <CardDescription>
              Customize how the interface looks and behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.preferences.theme}
                  onValueChange={(value: "light" | "dark" | "system") =>
                    updateSettings("preferences", "theme", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.preferences.language}
                  onValueChange={(value: "en" | "hi" | "ne") =>
                    updateSettings("preferences", "language", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                    <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={settings.preferences.dateFormat}
                  onValueChange={(
                    value: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"
                  ) => updateSettings("preferences", "dateFormat", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemsPerPage">Items Per Page</Label>
                <Select
                  value={settings.preferences.itemsPerPage.toString()}
                  onValueChange={(value) =>
                    updateSettings(
                      "preferences",
                      "itemsPerPage",
                      parseInt(value)
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 items</SelectItem>
                    <SelectItem value="20">20 items</SelectItem>
                    <SelectItem value="50">50 items</SelectItem>
                    <SelectItem value="100">100 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>
              Configure location and time preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.preferences.timezone}
                  onValueChange={(value) =>
                    updateSettings("preferences", "timezone", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Asia/Kolkata (IST)
                      </div>
                    </SelectItem>
                    <SelectItem value="Asia/Kathmandu">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Asia/Kathmandu (NPT)
                      </div>
                    </SelectItem>
                    <SelectItem value="UTC">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        UTC
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Current Settings Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Theme:</span>
                    <div className="flex items-center gap-1">
                      {getThemeIcon(settings.preferences.theme)}
                      <span className="capitalize">
                        {settings.preferences.theme}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Language:</span>
                    <span className="uppercase">
                      {settings.preferences.language}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date Format:</span>
                    <span>{settings.preferences.dateFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Privacy:</span>
                    <div className="flex items-center gap-1">
                      {getPrivacyIcon(settings.privacy.profileVisibility)}
                      <span className="capitalize">
                        {settings.privacy.profileVisibility.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Settings</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset all settings to their default
              values? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800 text-sm">
              All your customized preferences will be lost.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={resetSettings}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
