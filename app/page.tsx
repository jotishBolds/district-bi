import Link from "next/link";
import { ArrowRight, FileText, Users, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Hero Section */}
        <div className="space-y-8">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FileText className="w-10 h-10 text-white" />
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Digital Application
              <span className="block text-blue-600">Processing System</span>
            </h1>

            <p className="text-xl text-slate-600 max-w-lg mx-auto leading-relaxed">
              Streamline your government service applications with our efficient
              digital platform. Track, manage, and process applications
              seamlessly.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-sm">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">
                Multi-Role Access
              </h3>
              <p className="text-sm text-slate-600">
                Citizens, Officers, and Administrators
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-sm">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">
                Real-time Tracking
              </h3>
              <p className="text-sm text-slate-600">
                Monitor application status live
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-sm">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">
                Document Management
              </h3>
              <p className="text-sm text-slate-600">
                Secure file upload and verification
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
            >
              Go to Login
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Additional Info */}
          <div className="pt-8 border-t border-slate-200/50">
            <p className="text-sm text-slate-500">
              Secure • Efficient • Transparent
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
