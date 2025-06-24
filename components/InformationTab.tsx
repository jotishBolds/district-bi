"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, Clock, Users, ArrowRight } from "lucide-react";

export default function InformationTab() {
  const serviceInfo = [
    {
      id: "item-1",
      title: "Birth Certificate",
      icon: <FileText className="w-4 h-4 text-[#1170CD]" />,
      processingTime: "7 working days",
      requirements:
        "Hospital birth record, parents' ID proof, and address verification",
      fee: "₹50",
      description:
        "Official birth certificates are issued by the civil registration department with digital verification.",
    },
    {
      id: "item-2",
      title: "Land Registration",
      icon: <FileText className="w-4 h-4 text-[#1170CD]" />,
      processingTime: "14-21 working days",
      requirements: "Property documents, identity proof, and payment receipt",
      fee: "As per government rates",
      description:
        "Complete land registration services with digital record maintenance and verification.",
    },
    {
      id: "item-3",
      title: "Income Certificate",
      icon: <FileText className="w-4 h-4 text-[#1170CD]" />,
      processingTime: "10 working days",
      requirements: "Salary slips, tax returns, and residential proof",
      fee: "₹30",
      description:
        "Income certificates for employment, education, and government scheme applications.",
    },
    {
      id: "item-4",
      title: "Caste Certificate",
      icon: <FileText className="w-4 h-4 text-[#1170CD]" />,
      processingTime: "14 working days",
      requirements: "Supporting documentation from local authorities",
      fee: "₹40",
      description:
        "Caste certificates for reservation benefits and educational purposes with proper verification.",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
            Service Information
          </h3>
          <div className="w-8 h-8 bg-[#1170CD] rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
        </div>

        <hr className="border-t-3 border-[#1170CD] mb-6" />

        {/* Service Updates Badge */}
        <div className="inline-flex items-center bg-gradient-to-r from-[#1170CD] to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold mb-6 shadow-md">
          <span>Service Guide</span>
        </div>

        {/* Accordion */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <Accordion type="single" collapsible className="w-full">
            {serviceInfo.map((service) => (
              <AccordionItem
                key={service.id}
                value={service.id}
                className="border-b border-gray-100"
              >
                <AccordionTrigger className="hover:no-underline group py-4">
                  <div className="flex items-center gap-3 text-left">
                    {service.icon}
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1170CD] transition-colors duration-300">
                        {service.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {service.processingTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="ml-7 space-y-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {service.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="text-xs font-semibold text-[#1170CD] mb-1">
                          Processing Fee
                        </h5>
                        <p className="text-sm font-medium text-gray-900">
                          {service.fee}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="text-xs font-semibold text-green-700 mb-1">
                          Processing Time
                        </h5>
                        <p className="text-sm font-medium text-gray-900">
                          {service.processingTime}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">
                        Required Documents
                      </h5>
                      <p className="text-sm text-gray-600">
                        {service.requirements}
                      </p>
                    </div>

                    <button className="w-full mt-3 bg-[#1170CD] hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2">
                      <span>Apply Online</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* View More Button */}
        <div className="mt-6 flex justify-end">
          <button className="group flex items-center gap-2 text-sm font-semibold text-[#1170CD] hover:text-blue-700 transition-colors duration-300">
            <span>View All Services</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
