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
          href="/samadhan"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>Track Your Query</CardTitle>
            <CardDescription>
              Enter your reference ID to check the status of your query
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Input
                  placeholder="SAMADHAN-2025-12-24-00001"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="text-center font-mono"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Reference ID was provided when you submitted your query
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Track Status
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-600 mb-2">
                Don&apos;t have a reference ID?
              </p>
              <Link href="/samadhan/login">
                <Button variant="outline" size="sm">
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
