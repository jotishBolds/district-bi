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
import { useSamadhanI18n } from "@/lib/samadhan-i18n";

export default function SamadhanFooter() {
  const currentYear = new Date().getFullYear();
  const { t } = useSamadhanI18n();

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
                <h3 className="font-bold text-xl">{t("common.samadhan")}</h3>
                <p className="text-green-400 text-sm">
                  {t("common.grievancePortal")}
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {t("footer.description")}
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
                  {t("common.governmentOfSikkim")}
                </p>
                <p className="text-xs text-gray-400">
                  {t("common.officialPortal")}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/samadhan"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t("nav.home")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/samadhan/submit"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t("nav.submitQuery")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/samadhan/track"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t("nav.trackTicket")}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/samadhan/login"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t("common.loginRegister")}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              {t("footer.contactUs")}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {t("footer.office")}
                  </p>
                  <p className="text-gray-400 text-sm whitespace-pre-line">
                    {t("footer.officeAddress")}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {t("footer.phone")}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t("footer.phoneNumber")}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {t("footer.email")}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t("footer.emailAddress")}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {t("footer.officeHours")}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t("footer.officeHoursValue")}
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Related Links */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
              {t("footer.relatedLinks")}
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
                  <span>{t("footer.sikkimStatePortal")}</span>
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
                  <span>{t("footer.nationalPortal")}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li>
                <Link
                  href="/samadhan/dashboard"
                  className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
                >
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t("footer.citizenDashboard")}</span>
                </Link>
              </li>
            </ul>

            {/* Support Card */}
            <div className="mt-6 p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-800/30">
              <p className="text-sm font-medium text-white mb-2">
                {t("footer.needHelp")}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {t("footer.needHelpDesc")}
              </p>
              <Link
                href="/samadhan/submit?type=FEEDBACK"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
              >
                {t("footer.submitFeedback")}
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
                {t("footer.copyright", { year: String(currentYear) })}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {t("footer.initiative")}
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                {t("footer.privacyPolicy")}
              </Link>
              <Link
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                {t("footer.termsOfUse")}
              </Link>
              <Link
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                {t("footer.accessibility")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
