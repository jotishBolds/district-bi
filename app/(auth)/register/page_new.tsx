"use client";

import Link from "next/link";
import { ArrowLeft, Building, Phone, MapPin, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Application Services
          </h1>
          <p className="text-gray-600">
            Streamlined government services for citizens
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Building className="h-6 w-6 text-blue-600" />
              Visit District Office for Services
            </CardTitle>
            <CardDescription>
              We&apos;ve simplified our process to serve you better
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Building className="h-4 w-4" />
              <AlertDescription>
                <strong>New Service Model:</strong> To ensure better assistance
                and faster processing, all application services are now handled
                directly at our district office. Our trained frontdesk staff
                will help you submit your applications.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                District Office Location
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">District Collectorate Office</p>
                <p className="text-gray-600">Gangtok, East Sikkim</p>
                <p className="text-gray-600">Sikkim - 737101</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Office Hours
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>Monday - Friday:</strong> 10:00 AM - 5:00 PM
                </p>
                <p>
                  <strong>Saturday:</strong> 10:00 AM - 2:00 PM
                </p>
                <p>
                  <strong>Sunday:</strong> Closed
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                Contact Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>Phone:</strong> +91-3592-202101
                </p>
                <p>
                  <strong>Email:</strong> dc-east@sikkim.gov.in
                </p>
                <p>
                  <strong>Helpline:</strong> 1800-345-6789
                </p>
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                Services Available:
              </h4>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>• Certificate Applications (Birth, Death, Income, etc.)</li>
                <li>• Land & Property Related Services</li>
                <li>• Business License Applications</li>
                <li>• Social Welfare Scheme Applications</li>
                <li>• Document Verification Services</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">
                Track Your Application:
              </h4>
              <p className="text-green-800 text-sm mb-3">
                Once your application is submitted at our office, you can track
                its status online.
              </p>
              <Link href="/track">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Track Application Status
                </Button>
              </Link>
            </div>

            <div className="flex justify-center">
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
