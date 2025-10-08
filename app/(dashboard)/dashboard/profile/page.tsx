"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Building,
  Edit,
  Lock,
  Save,
  X,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/app/generated/prisma";
import { getRoleMapping, isOfficerRole } from "@/lib/officer-roles";

interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  level?: number;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  citizenProfile?: {
    id: string;
    fullName: string;
    phone: string;
    address: string;
    aadhaarNumber?: string;
  };
  officerProfile?: {
    id: string;
    fullName: string;
    designation: string;
    department: string;
    officeLocation?: string;
    isAvailable: boolean;
    sectionId?: string;
    section?: {
      id: string;
      name: string;
      description?: string;
    };
  };
}

interface Section {
  id: string;
  name: string;
  description?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    aadhaarNumber: "",
    designation: "",
    department: "",
    officeLocation: "",
    sectionId: "",
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchProfile();
    fetchSections();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);

        // Populate form data
        const user = data.user;
        if (user.officerProfile) {
          setFormData({
            fullName: user.officerProfile.fullName || "",
            phone: user.phone || "",
            address: "",
            aadhaarNumber: "",
            designation: user.officerProfile.designation || "",
            department: user.officerProfile.department || "",
            officeLocation: user.officerProfile.officeLocation || "",
            sectionId: user.officerProfile.sectionId || "",
          });
        } else if (user.citizenProfile) {
          setFormData({
            fullName: user.citizenProfile.fullName || "",
            phone: user.citizenProfile.phone || "",
            address: user.citizenProfile.address || "",
            aadhaarNumber: user.citizenProfile.aadhaarNumber || "",
            designation: "",
            department: "",
            officeLocation: "",
            sectionId: "",
          });
        }
      } else {
        toast.error("Failed to fetch profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Error fetching profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/admin/sections");
      if (response.ok) {
        const data = await response.json();
        setSections(data.sections || []);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      // Only send basic information fields that users can edit
      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        // Include citizen-specific fields only if user is a citizen
        ...(profile?.citizenProfile && {
          address: formData.address,
          aadhaarNumber: formData.aadhaarNumber,
        }),
      };

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setEditing(false);
        toast.success("Profile updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }

      setSaving(true);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updatePassword",
          ...passwordData,
        }),
      });

      if (response.ok) {
        setPasswordDialogOpen(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast.success("Password updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Error updating password");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roleMapping = getRoleMapping(role);
    const isOfficer = isOfficerRole(role);

    if (role === UserRole.SUPER_ADMIN) {
      return { text: "Super Admin", color: "bg-purple-100 text-purple-800" };
    }
    if (role === UserRole.ADMIN) {
      return { text: "Admin", color: "bg-red-100 text-red-800" };
    }
    if (role === UserRole.FRONT_DESK) {
      return { text: "Front Desk", color: "bg-green-100 text-green-800" };
    }
    if (role === UserRole.DISPATCH_HANDLER) {
      return {
        text: "Dispatch Handler",
        color: "bg-orange-100 text-orange-800",
      };
    }
    if (isOfficer && roleMapping) {
      return {
        text: roleMapping.shortDesignation,
        color: "bg-blue-100 text-blue-800",
      };
    }

    return { text: role, color: "bg-gray-100 text-gray-800" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Profile Not Found
            </h3>
            <p className="text-gray-500 text-center">
              Unable to load your profile. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOfficer = profile.officerProfile !== null;
  const roleBadge = getRoleBadge(profile.role);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          {editing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  // Reset form data
                  const user = profile;
                  if (user.officerProfile) {
                    setFormData({
                      fullName: user.officerProfile.fullName || "",
                      phone: user.phone || "",
                      address: "",
                      aadhaarNumber: "",
                      designation: user.officerProfile.designation || "",
                      department: user.officerProfile.department || "",
                      officeLocation: user.officerProfile.officeLocation || "",
                      sectionId: user.officerProfile.sectionId || "",
                    });
                  } else if (user.citizenProfile) {
                    setFormData({
                      fullName: user.citizenProfile.fullName || "",
                      phone: user.citizenProfile.phone || "",
                      address: user.citizenProfile.address || "",
                      aadhaarNumber: user.citizenProfile.aadhaarNumber || "",
                      designation: "",
                      department: "",
                      officeLocation: "",
                      sectionId: "",
                    });
                  }
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4">
              {(
                profile.officerProfile?.fullName ||
                profile.citizenProfile?.fullName ||
                "U"
              )
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2)}
            </div>
            <CardTitle className="text-xl">
              {profile.officerProfile?.fullName ||
                profile.citizenProfile?.fullName ||
                "User"}
            </CardTitle>
            <CardDescription className="space-y-2">
              <Badge className={roleBadge.color} variant="secondary">
                {roleBadge.text}
              </Badge>
              {profile.level !== null && profile.level !== undefined && (
                <div className="text-sm text-muted-foreground">
                  Level {profile.level}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="break-all">{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {formatDate(profile.createdAt)}</span>
            </div>
            {profile.lastLoginAt && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Last login {formatDate(profile.lastLoginAt)}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div
                className={`h-2 w-2 rounded-full ${
                  profile.isActive ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span>{profile.isActive ? "Active" : "Inactive"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              {editing
                ? "Update your profile information"
                : "View your profile details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  {editing ? (
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md">
                      {formData.fullName || "Not provided"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md">
                      {formData.phone || "Not provided"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isOfficer ? (
              /* Officer-specific fields - Read-only */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">Officer Information</h3>
                  <Badge variant="outline" className="text-xs">
                    Read-only
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formData.designation || "Not provided"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formData.department || "Not provided"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officeLocation">Office Location</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formData.officeLocation || "Not provided"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sectionId">Section</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {profile.officerProfile?.section?.name ? (
                        <span className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {profile.officerProfile.section.name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          Section not assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-md p-3">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Officer information can only be updated by an administrator.
                  Contact your admin if changes are needed.
                </div>
              </div>
            ) : (
              /* Citizen-specific fields */
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    {editing ? (
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder="Enter your address"
                        rows={3}
                      />
                    ) : (
                      <div className="p-2 bg-muted rounded-md min-h-[80px]">
                        {formData.address || "Not provided"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                    {editing ? (
                      <Input
                        id="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            aadhaarNumber: e.target.value,
                          })
                        }
                        placeholder="Enter your Aadhaar number"
                        maxLength={12}
                      />
                    ) : (
                      <div className="p-2 bg-muted rounded-md">
                        {formData.aadhaarNumber
                          ? `XXXX-XXXX-${formData.aadhaarNumber.slice(-4)}`
                          : "Not provided"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      current: !showPasswords.current,
                    })
                  }
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      new: !showPasswords.new,
                    })
                  }
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      confirm: !showPasswords.confirm,
                    })
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePassword} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
