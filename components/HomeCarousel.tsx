"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

export function HomeCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const slides = [
    {
      src: "/assets/dcslide1.png",
      title: "Digital Government Services",
      subtitle: "Empowering citizens through digital transformation",
      description:
        "Access government services seamlessly from anywhere, anytime",
    },
    {
      src: "/assets/dcslide2.png",
      title: "Efficient Public Administration",
      subtitle: "Streamlined processes for better governance",
      description:
        "Experience faster, transparent, and citizen-centric services",
    },
  ];

  // Track API and update current slide
  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Auto-slide logic every 5 seconds
  React.useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      const nextIndex = (api.selectedScrollSnap() + 1) % (count || 1);
      api.scrollTo(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [api, count]);

  return (
    // Remove any container margins/padding and make it seamless
    <div className="w-full relative -mt-0">
      <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
        <CarouselContent className="-ml-0">
          {slides.map((slide, index) => (
            <CarouselItem key={index} className="w-full pl-0">
              {/* Remove Card component styling that creates gaps */}
              <div className="w-full">
                <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] overflow-hidden">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <Image
                      src={slide.src}
                      alt={slide.title}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="max-w-xl lg:max-w-2xl text-white">
                        <div className="space-y-2 sm:space-y-4">
                          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                            {slide.title}
                          </h1>
                          <p className="text-lg sm:text-xl md:text-2xl font-medium text-blue-200">
                            {slide.subtitle}
                          </p>
                          <p className="text-sm sm:text-base md:text-lg text-gray-200 max-w-lg">
                            {slide.description}
                          </p>
                          <div className="pt-2 sm:pt-4">
                            <button className="bg-[#1170CD] hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:py-3 sm:px-6 rounded-lg transition-colors duration-300 shadow-lg">
                              Explore Services
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Arrows - Hidden on mobile, visible on larger screens */}
        <CarouselPrevious className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 transition-all duration-300 w-12 h-12" />
        <CarouselNext className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 transition-all duration-300 w-12 h-12" />
      </Carousel>

      {/* Dots and Progress Bar Container */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 flex flex-col items-center space-y-2 px-4 py-2 bg-black/40 rounded-xl shadow-lg backdrop-blur-sm">
        {/* Dot Indicators */}
        <div className="flex space-x-2">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/70 ${
                current === index + 1
                  ? "bg-white scale-125 shadow"
                  : "bg-white/60 hover:bg-white/80"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        {/* Progress Bar */}
        <div className="w-24 sm:w-32 h-1.5 bg-white/30 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[#1170CD] transition-all duration-300 ease-linear rounded-full"
            style={{ width: `${(current / count) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
