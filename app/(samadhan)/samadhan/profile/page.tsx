"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

interface ProfileData {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  pseudonym: string;
}

export default function CitizenProfilePage() {
  const router = useRouter();
  const { t } = useSamadhanI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPseudonym, setShowPseudonym] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    pseudonym: "",
  });

  // Check SAMADHAN session (separate from NextAuth)
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      try {
        const sessionResponse = await fetch(
          "/api/samadhan/auth?action=session",
        );
        const sessionData = await sessionResponse.json();

        if (!sessionData.authenticated) {
          router.push("/samadhan/login");
          return;
        }

        // Session valid, fetch profile
        await fetchProfile();
      } catch (error) {
        console.error("Session check error:", error);
        router.push("/samadhan/login");
      }
    };

    checkSessionAndFetch();
  }, [router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/samadhan/profile");
      const data = await response.json();

      if (data.success) {
        setProfile({
          fullName: data.data.fullName || "",
          phone: data.data.phone || "",
          email: data.data.email || "",
          address: data.data.address || "",
          pseudonym: data.data.pseudonym || "Anonymous Citizen",
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error(t("profile.failedLoadProfile"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/samadhan/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          address: profile.address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t("profile.profileUpdated"));
        // Reload the page to refresh navbar with new session data
        window.location.reload();
      } else {
        toast.error(data.message || t("profile.failedUpdateProfile"));
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(t("profile.failedSaveProfile"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/samadhan/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("profile.backToDashboard")}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("profile.myProfile")}
          </h1>
          <p className="text-gray-600">{t("profile.manageProfile")}</p>
        </div>

        {/* Privacy Notice */}
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>{t("profile.privacyNotice")}</strong>{" "}
            {t("profile.privacyNoticeDesc")}
          </AlertDescription>
        </Alert>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("profile.profileInformation")}
            </CardTitle>
            <CardDescription>{t("profile.updateInfo")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pseudonym Display */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <Label className="text-sm font-medium text-green-700">
                {t("profile.anonymousIdentity")}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-semibold text-green-900">
                  {showPseudonym ? profile.pseudonym : "••••••••••••"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPseudonym(!showPseudonym)}
                  className="h-8 w-8 p-0"
                >
                  {showPseudonym ? (
                    <EyeOff className="h-4 w-4 text-green-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-green-600" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {t("profile.identityNote")}
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                {t("profile.fullName")}
              </Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) =>
                  setProfile({ ...profile, fullName: e.target.value })
                }
                placeholder={t("profile.fullNamePlaceholder")}
              />
              <p className="text-xs text-gray-500">
                {t("profile.fullNameHelp")}
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                {t("profile.phoneNumber")}
              </Label>
              <Input
                id="phone"
                value={profile.phone}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">{t("profile.phoneHelp")}</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                {t("profile.emailAddress")}
              </Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">{t("profile.emailHelp")}</p>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                {t("profile.address")}
              </Label>
              <Textarea
                id="address"
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
                placeholder={t("profile.addressPlaceholder")}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                {t("profile.addressHelp")}
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("profile.saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t("profile.saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("profile.privacyInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <p>{t("profile.privacyInfo1")}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <p>{t("profile.privacyInfo2")}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
              <p>{t("profile.privacyInfo3")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
