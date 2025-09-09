import InformationTab from "./InformationTab";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";

export default function NewsHighlights() {
  const newsItems = [
    {
      id: 1,
      title:
        "State government launches new digital portal for land records certification",
      date: "June 22, 2025",
      category: "Digital Services",
    },
    {
      id: 2,
      title:
        "District Administrative Centre to remain closed on July 5th for system maintenance",
      date: "June 21, 2025",
      category: "Notice",
    },
    {
      id: 3,
      title:
        "E-governance initiative receives national recognition for innovation in public service delivery",
      date: "June 20, 2025",
      category: "Achievement",
    },
    {
      id: 4,
      title:
        "New citizen feedback system implemented for all government services",
      date: "June 19, 2025",
      category: "Update",
    },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Digital Services":
        return "bg-blue-100 text-blue-800";
      case "Notice":
        return "bg-red-100 text-red-800";
      case "Achievement":
        return "bg-green-100 text-green-800";
      case "Update":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="w-full bg-muted/30 py-8 sm:py-12">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* News Box */}
          <div className="w-full lg:w-1/2 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  News Highlights
                </h3>
                <div className="w-8 h-8 bg-[#1170CD] rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
              </div>

              <hr className="border-t-3 border-[#1170CD] mb-6" />

              {/* Top News Badge */}
              <div className="inline-flex items-center bg-gradient-to-r from-[#1170CD] to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold mb-6 shadow-md">
                <span>Latest Updates</span>
              </div>

              {/* News Items */}
              <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {newsItems.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 rounded-lg border border-gray-100 hover:border-[#1170CD] hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <ChevronRight className="w-5 h-5 text-[#1170CD] group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.date}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* View More Button */}
              <div className="mt-6 flex justify-end">
                <button className="group flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#1170CD] border-2 border-[#1170CD] rounded-lg hover:bg-[#1170CD] hover:text-white transition-all duration-300">
                  <span>View All News</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Information Tab */}
          <div className="w-full lg:w-1/2">
            <InformationTab />
          </div>
        </div>
      </div>
    </div>
  );
}
