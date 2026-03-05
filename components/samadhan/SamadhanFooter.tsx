"use client";

import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Clock,
  FileText,
  HelpCircle,
  Shield,
  Send,
  Home,
  User,
  Globe,
  Building2,
} from "lucide-react";

export default function SamadhanFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl">SAMADHAN</h3>
                <p className="text-green-400 text-sm">Grievance Portal</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              A citizen-centric initiative to submit and track grievances and
              feedback for District Administrative Centre, Gangtok services.
            </p>

            {/* Government Seal */}
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <Image
                src="/assets/seal_of_sikkim.png"
                width={48}
                height={48}
                quality={95}
                alt="Seal of Sikkim"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-white">
                  Government of Sikkim
                </p>
                <p className="text-xs text-gray-400">Official Portal</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/samadhan"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/samadhan/submit"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Submit Query</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/samadhan/track"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Track Ticket</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/samadhan/login"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Login / Register</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Office</p>
                  <p className="text-gray-400 text-sm">
                    District Administrative Centre
                    <br />
                    Gangtok, Sikkim - 737101
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Helpline</p>
                  <p className="text-gray-400 text-sm">
                    1800-XXX-XXXX (Toll Free)
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Email</p>
                  <p className="text-gray-400 text-sm">
                    samadhan@dacgangtok.in
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Office Hours</p>
                  <p className="text-gray-400 text-sm">
                    Mon - Sat: 10:00 AM - 5:00 PM
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Related Links */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              Related Links
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://sikkim.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <Globe className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Sikkim State Portal</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li>
                <a
                  href="https://india.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>National Portal</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li>
                <Link
                  href="/samadhan/dashboard"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Citizen Dashboard</span>
                </Link>
              </li>
            </ul>

            {/* Support Card */}
            <div className="mt-6 p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-800/30">
              <p className="text-sm font-medium text-white mb-2">Need Help?</p>
              <p className="text-xs text-gray-400 mb-3">
                For technical support or assistance with the portal.
              </p>
              <Link
                href="/samadhan/submit?type=FEEDBACK"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
              >
                Submit Feedback
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm">
                © {currentYear} District Administrative Centre, Gangtok. All
                rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                An initiative under the Government of Sikkim
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                Terms of Use
              </Link>
              <Link
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
