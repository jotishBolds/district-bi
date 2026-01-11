"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
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

export default function TrackPage() {
  const [referenceId, setReferenceId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!referenceId.trim()) {
      toast.error("Please enter a reference ID");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/samadhan/tickets?referenceId=${encodeURIComponent(
          referenceId.trim()
        )}`
      );
      const data = await response.json();

      if (data.success) {
        router.push(`/samadhan/track/${referenceId.trim()}`);
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
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-green-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8 bg-gradient-to-b from-green-50 to-white">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Search className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Track Your Query
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your reference ID to check the status of your query
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <div className="relative">
                  <Input
                    placeholder="SAMADHAN-2025-XX-XX-XXXXX"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="h-14 pl-6 pr-14 text-center font-mono text-base border-2 rounded-full border-green-200 focus:border-green-500 focus:ring-green-500 bg-white shadow-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      type="submit"
                      disabled={isSearching || !referenceId.trim()}
                      className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearching ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Search className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Reference ID was provided when you submitted your query
                </p>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Don&apos;t have a reference ID?
              </p>
              <Link href="/samadhan/login">
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-green-200 hover:bg-green-50 hover:border-green-400"
                >
                  Login to View Your Queries
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
