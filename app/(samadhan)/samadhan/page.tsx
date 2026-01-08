"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Search,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  User,
  LogOut,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SamadhanSession {
  userId: string;
  phone: string;
  name: string;
  pseudonym: string;
}

export default function SamadhanHomePage() {
  const [session, setSession] = useState<SamadhanSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [trackingId, setTrackingId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Check SAMADHAN session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/samadhan/auth?action=session");
        const data = await response.json();
        if (data.authenticated && data.session) {
          setSession(data.session);
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/samadhan/auth?action=logout", { method: "POST" });
      setSession(null);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a reference ID");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/samadhan/tickets?referenceId=${encodeURIComponent(
          trackingId.trim()
        )}`
      );
      const data = await response.json();

      if (data.success) {
        router.push(`/samadhan/track/${trackingId.trim()}`);
      } else {
        toast.error("Ticket not found. Please check the reference ID.");
      }
    } catch (error) {
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/assets/emblem.png"
                alt="Government Emblem"
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">SAMADHAN</h1>
                <p className="text-xs text-gray-500">DAC Gangtok</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                href="/samadhan/submit"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Submit Query
              </Link>
              <Link
                href="/samadhan/track"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Track Status
              </Link>
              {isCheckingSession ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : session ? (
                <>
                  <Link href="/samadhan/dashboard">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      My Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Link href="/samadhan/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col space-y-3">
                <Link
                  href="/samadhan/submit"
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Submit Query
                </Link>
                <Link
                  href="/samadhan/track"
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Track Status
                </Link>
                {isCheckingSession ? (
                  <div className="px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : session ? (
                  <>
                    <Link
                      href="/samadhan/dashboard"
                      className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      My Dashboard
                    </Link>
                    <button
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center text-left"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4 mr-2" />
                      )}
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/samadhan/login"
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-90" />
        <div className="absolute inset-0 bg-[url('/assets/pattern.svg')] opacity-10" />

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your Voice Matters
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Submit feedback, grievances, or suggestions about DAC services. We
              are committed to addressing your concerns transparently and
              efficiently.
            </p>

            {/* Quick Track */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 max-w-xl mx-auto">
              <p className="text-white text-sm mb-3">
                Already submitted? Track your query:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Reference ID (e.g., SAMADHAN-2025-12-24-00001)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="bg-white/90"
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                />
                <Button onClick={handleTrack} disabled={isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  Track
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Query Types Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              How Can We Help You?
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the type of query that best describes your concern
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feedback Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full border-2 hover:border-green-500 cursor-pointer transition-all">
                <Link href="/samadhan/submit?type=FEEDBACK">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-green-700">Feedback</CardTitle>
                    <CardDescription>
                      Share positive experiences or constructive suggestions
                      about our services
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                      <li>✓ Service quality feedback</li>
                      <li>✓ Staff appreciation</li>
                      <li>✓ Facility improvements</li>
                    </ul>
                    <Button
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      Submit Feedback <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>

            {/* Grievance Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full border-2 hover:border-red-500 cursor-pointer transition-all">
                <Link href="/samadhan/submit?type=GRIEVANCE">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-red-700">Grievance</CardTitle>
                    <CardDescription>
                      Report complaints about services, delays, or issues faced
                      at DAC
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                      <li>✓ Service complaints</li>
                      <li>✓ Administrative delays</li>
                      <li>✓ Process issues</li>
                    </ul>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      File Grievance <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>

            {/* Suggestion Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="h-full border-2 hover:border-amber-500 cursor-pointer transition-all">
                <Link href="/samadhan/submit?type=SUGGESTION">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lightbulb className="h-8 w-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-amber-700">Suggestion</CardTitle>
                    <CardDescription>
                      Propose ideas for improving DAC services and processes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                      <li>✓ Process improvements</li>
                      <li>✓ New service ideas</li>
                      <li>✓ System enhancements</li>
                    </ul>
                    <Button
                      variant="outline"
                      className="text-amber-600 border-amber-600 hover:bg-amber-50"
                    >
                      Share Suggestion <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose SAMADHAN?
            </h3>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-2">Privacy Protected</h4>
              <p className="text-sm text-gray-600">
                Submit anonymously or with your identity - your choice
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold mb-2">SLA Guaranteed</h4>
              <p className="text-sm text-gray-600">
                Timely resolution with automatic escalation for delays
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-2">Transparent Tracking</h4>
              <p className="text-sm text-gray-600">
                Real-time updates on your query status
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-semibold mb-2">Multiple Channels</h4>
              <p className="text-sm text-gray-600">
                Submit via web portal or WhatsApp
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to Share Your Concern?
          </h3>
          <p className="text-blue-100 mb-8">
            Login for a personalized experience or continue as guest for
            anonymous submission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/samadhan/login">
              <Button size="lg" variant="secondary">
                Login / Register
              </Button>
            </Link>
            <Link href="/samadhan/submit">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent text-white border-white hover:bg-white/10"
              >
                Continue as Guest
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">SAMADHAN Portal</h4>
              <p className="text-sm">
                A citizen grievance redressal initiative by District
                Administrative Centre, Gangtok.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/samadhan/submit" className="hover:text-white">
                    Submit Query
                  </Link>
                </li>
                <li>
                  <Link href="/samadhan/track" className="hover:text-white">
                    Track Status
                  </Link>
                </li>
                <li>
                  <Link href="/samadhan/faq" className="hover:text-white">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  DAC Complex, Gangtok, Sikkim
                </li>
                <li className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +91-XXXXXXXXXX
                </li>
                <li className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  dac@dacgangtok.in
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>
              © {new Date().getFullYear()} District Administrative Centre,
              Gangtok. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
