"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  FileText,
  Users,
  Settings,
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  BookOpen,
  Video,
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ArrowRight,
  MessageCircle,
  Headphones,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SupportPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const quickGuides = [
    {
      title: "Submit New Application",
      description:
        "Learn how to submit a new application through the frontdesk",
      icon: FileText,
      steps: [
        "Visit frontdesk",
        "Provide required documents",
        "Fill application form",
        "Submit and get RR number",
      ],
      category: "Getting Started",
    },
    {
      title: "Track Application Status",
      description: "Monitor the progress of your submitted applications",
      icon: Search,
      steps: [
        "Use RR number",
        "Enter tracking details",
        "View current status",
        "Check processing timeline",
      ],
      category: "Tracking",
    },
    {
      title: "Understanding Officer Roles",
      description:
        "Learn about different officer levels and their responsibilities",
      icon: Users,
      steps: [
        "DC - District Collector",
        "ADC - Additional District Collector",
        "RO - Revenue Officer",
        "SDM - Sub Divisional Magistrate",
      ],
      category: "System",
    },
    {
      title: "Document Requirements",
      description: "Know what documents are needed for different services",
      icon: FileText,
      steps: [
        "ID Proof (Aadhaar/PAN)",
        "Address Proof",
        "Application Form",
        "Supporting Documents",
      ],
      category: "Documents",
    },
  ];

  const faqs = [
    {
      question: "How do I track my application?",
      answer:
        "You can track your application using the RR number provided at the time of submission. Go to the tracking page, enter your RR number and contact details to view the current status.",
      category: "Tracking",
    },
    {
      question: "What documents do I need to submit?",
      answer:
        "Required documents vary by service type but generally include ID proof (Aadhaar/PAN), address proof, and service-specific supporting documents. Check with the frontdesk for exact requirements.",
      category: "Documents",
    },
    {
      question: "How long does application processing take?",
      answer:
        "Processing time depends on the service category and complexity. Most applications are processed within 7-15 working days. You'll receive notifications for any status updates.",
      category: "Processing",
    },
    {
      question: "Can I submit applications online?",
      answer:
        "Currently, applications must be submitted through authorized frontdesk offices to ensure proper processing and security.",
      category: "Submission",
    },
    {
      question: "What if my application is rejected?",
      answer:
        "If rejected, you'll receive detailed reasons. You can resubmit with corrected information or appeal the decision through the proper channels.",
      category: "Processing",
    },
    {
      question: "How do I update my contact information?",
      answer:
        "Contact the frontdesk office where you submitted your application with valid ID proof to update your contact details.",
      category: "Account",
    },
  ];

  const contactInfo = {
    office: {
      name: "District Collectorate",
      address: "Civil Lines, District Headquarters",
      phone: "+91-XXXX-XXXXXX",
      email: "dc.office@district.gov.in",
      hours: "Monday to Friday: 10:00 AM - 5:00 PM",
    },
    support: {
      helpdesk: "+91-XXXX-XXXXXX",
      email: "support@district.gov.in",
      hours: "Monday to Saturday: 9:00 AM - 6:00 PM",
    },
  };

  const serviceCategories = [
    {
      name: "Revenue Services",
      description: "Land records, certificates, revenue-related matters",
      examples: ["Land Records", "Income Certificate", "Caste Certificate"],
      icon: FileText,
    },
    {
      name: "Administrative Services",
      description: "Government approvals, licenses, permits",
      examples: ["Business License", "NOC Applications", "Permits"],
      icon: Settings,
    },
    {
      name: "Social Welfare",
      description: "Pension schemes, welfare programs, benefits",
      examples: ["Pension Applications", "Welfare Schemes", "Subsidies"],
      icon: Users,
    },
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6">
                <Headphones className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-slate-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-4">
                Support & Help Center
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Find answers to your questions, learn how to use the system, and
                get the support you need for all district services
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search for help topics, FAQs, or guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 dark:border-slate-700 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="guides" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 h-auto md:h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <TabsTrigger
                value="guides"
                className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200"
              >
                <BookOpen className="h-4 w-4" />
                <span>Quick Guides</span>
              </TabsTrigger>
              <TabsTrigger
                value="faq"
                className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200"
              >
                <HelpCircle className="h-4 w-4" />
                <span>FAQ</span>
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                <span>Services</span>
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Contact</span>
              </TabsTrigger>
            </TabsList>

            {/* Quick Guides Tab */}
            <TabsContent value="guides" className="space-y-8 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {quickGuides.map((guide, index) => {
                  const Icon = guide.icon;
                  return (
                    <Card
                      key={index}
                      className="group hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {guide.title}
                            </CardTitle>
                            <Badge
                              variant="secondary"
                              className="mt-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              {guide.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm leading-relaxed">
                          {guide.description}
                        </p>
                        <div className="space-y-2">
                          {guide.steps.map((step, stepIndex) => (
                            <div
                              key={stepIndex}
                              className="flex items-center space-x-2 text-sm"
                            >
                              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                                {stepIndex + 1}
                              </div>
                              <span className="text-slate-600 dark:text-slate-300">
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="space-y-6 mt-8">
              <div className="max-w-4xl mx-auto">
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFAQs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg px-6 shadow-sm"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex items-start space-x-3 text-left">
                          <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {faq.question}
                            </span>
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs border-blue-200 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                            >
                              {faq.category}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 dark:text-slate-300 pt-2 pb-4 pl-8">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {filteredFAQs.length === 0 && searchQuery && (
                  <div className="text-center py-12">
                    <HelpCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No results found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      Try searching with different keywords or browse all FAQs
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-8 mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {serviceCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <Card
                      key={index}
                      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300"
                    >
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-slate-900 dark:text-slate-100">
                              {category.name}
                            </CardTitle>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h4 className="font-medium mb-3 text-slate-900 dark:text-slate-100">
                          Common Services:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {category.examples.map((example, exampleIndex) => (
                            <Badge
                              key={exampleIndex}
                              variant="secondary"
                              className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Processing Timeline */}
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                    <Clock className="h-5 w-5" />
                    <span>Typical Processing Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-medium shadow-lg">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Application Submission
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Immediate - Get RR number instantly
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-full flex items-center justify-center font-medium shadow-lg">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Document Processing
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          1-2 working days
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-medium shadow-lg">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Processing & Review
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          3-10 working days
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-medium shadow-lg">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Completion & Dispatch
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          1-2 working days
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-6 mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Office Contact */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <span>Office Contact</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">
                        {contactInfo.office.name}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300">
                        {contactInfo.office.address}
                      </p>
                    </div>
                    <Separator className="bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contactInfo.office.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contactInfo.office.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contactInfo.office.hours}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Support Contact */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                      <Headphones className="h-5 w-5 text-blue-500" />
                      <span>Technical Support</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">
                        Help Desk
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300">
                        For technical issues and system support
                      </p>
                    </div>
                    <Separator className="bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contactInfo.support.helpdesk}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contactInfo.support.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {contactInfo.support.hours}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Emergency Contact */}
              <Card className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span>Emergency Services</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600 dark:text-red-400 mb-4">
                    For urgent matters requiring immediate attention
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shadow-lg"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Emergency: 100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      emergency@district.gov.in
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-blue-900 dark:text-blue-100">
                    Send Feedback
                  </CardTitle>
                  <p className="text-blue-700 dark:text-blue-300">
                    Help us improve our services
                  </p>
                </CardHeader>
                <CardContent>
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Feedback
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SupportPage;
