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
} from "lucide-react";

const HelpPage = () => {
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
        "Currently, applications must be submitted through authorized frontdesk offices to ensure proper document verification and security.",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Help & Support Center
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Find answers to your questions, learn how to use the system, and
              get the support you need
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for help topics, FAQs, or guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <Tabs defaultValue="guides" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="guides">Quick Guides</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          {/* Quick Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {quickGuides.map((guide, index) => {
                const Icon = guide.icon;
                return (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {guide.title}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {guide.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 mb-4">{guide.description}</p>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-700">
                          Steps:
                        </h4>
                        {guide.steps.map((step, stepIndex) => (
                          <div
                            key={stepIndex}
                            className="flex items-center space-x-2 text-sm"
                          >
                            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {stepIndex + 1}
                            </div>
                            <span className="text-slate-600">{step}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Additional Resources */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Additional Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <Video className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Video Tutorials</h4>
                      <p className="text-sm text-slate-600">
                        Step-by-step video guides
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <Download className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-medium">Download Forms</h4>
                      <p className="text-sm text-slate-600">
                        Printable application forms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <HelpCircle className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Live Chat</h4>
                      <p className="text-sm text-slate-600">Get instant help</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <p className="text-slate-600">
                  {searchQuery
                    ? `Found ${filteredFAQs.length} results`
                    : "Common questions and answers"}
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center justify-between w-full">
                          <span>{faq.question}</span>
                          <Badge variant="outline" className="ml-2">
                            {faq.category}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 text-slate-600">{faq.answer}</div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              {serviceCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle>{category.name}</CardTitle>
                          <p className="text-slate-600">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium mb-3">Common Services:</h4>
                      <div className="flex flex-wrap gap-2">
                        {category.examples.map((example, exampleIndex) => (
                          <Badge key={exampleIndex} variant="secondary">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Typical Processing Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Application Submission</h4>
                      <p className="text-sm text-slate-600">
                        Immediate - Get RR number instantly
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-medium">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Document Verification</h4>
                      <p className="text-sm text-slate-600">1-2 working days</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Processing & Review</h4>
                      <p className="text-sm text-slate-600">
                        3-10 working days
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-medium">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Completion & Dispatch</h4>
                      <p className="text-sm text-slate-600">1-2 working days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Office Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Office Contact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">{contactInfo.office.name}</h4>
                    <p className="text-slate-600">
                      {contactInfo.office.address}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span>{contactInfo.office.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span>{contactInfo.office.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>{contactInfo.office.hours}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Support Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <HelpCircle className="h-5 w-5" />
                    <span>Technical Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">Help Desk</h4>
                    <p className="text-slate-600">
                      For technical issues and system support
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span>{contactInfo.support.helpdesk}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span>{contactInfo.support.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>{contactInfo.support.hours}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Emergency Contact */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>Emergency Services</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600 mb-4">
                  For urgent matters requiring immediate attention
                </p>
                <div className="flex items-center space-x-4">
                  <Button variant="destructive" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Emergency: 100
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    emergency@district.gov.in
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Send Feedback</CardTitle>
                <p className="text-slate-600">Help us improve our services</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full sm:w-auto">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Feedback
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HelpPage;
