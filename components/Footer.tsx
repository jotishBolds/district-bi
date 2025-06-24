import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-neutral-800 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo & Title */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/assets/Seal_of_Sikkim_red.svg"
                alt="Seal of Sikkim"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
              />
              <h6 className="text-sm sm:text-base font-bold leading-tight">
                District Administration Centre
              </h6>
            </div>
            <p className="text-xs sm:text-sm font-light text-gray-300 leading-relaxed max-w-xs">
              Your gateway to efficient government services. Apply, track and
              manage your applications in one place.
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h6 className="text-sm sm:text-base font-bold mb-4 text-white">
              Quick Links
            </h6>
            <nav className="space-y-3">
              <Link
                href="/"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Home
              </Link>
              <Link
                href="/services"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Services
              </Link>
              <Link
                href="/information"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Information & Updates
              </Link>
              <Link
                href="/citizen-charter"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Citizen Charter
              </Link>
            </nav>
          </div>

          {/* Help & Support */}
          <div className="col-span-1">
            <h6 className="text-sm sm:text-base font-bold mb-4 text-white">
              Help & Support
            </h6>
            <nav className="space-y-3">
              <Link
                href="/faqs"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                FAQs
              </Link>
              <Link
                href="/contact"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Contact Us
              </Link>
              <Link
                href="/support"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Technical Support
              </Link>
              <Link
                href="/feedback"
                className="block text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
              >
                Feedback
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="col-span-1">
            <h6 className="text-sm sm:text-base font-bold mb-4 text-white">
              Contact Us
            </h6>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-300" />
                <span className="text-xs sm:text-sm font-light text-gray-300 leading-relaxed">
                  District Administration Office,
                  <br />
                  Gangtok, East Sikkim - 737101
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 flex-shrink-0 text-gray-300" />
                <a
                  href="tel:+918572145963"
                  className="text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200"
                >
                  +91 8572145963
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 flex-shrink-0 text-gray-300" />
                <a
                  href="mailto:citizen@sikkim.gov.in"
                  className="text-xs sm:text-sm font-light text-gray-300 hover:text-white transition-colors duration-200 break-all"
                >
                  citizen@sikkim.gov.in
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="w-full border-t border-gray-600 my-8 lg:my-10" />

        {/* Footer Bottom */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
            © {new Date().getFullYear()} District Administration Centre, East
            Sikkim. All Rights Reserved.
          </p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6">
            <Link
              href="/privacy-policy"
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <Link
              href="/accessibility"
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
