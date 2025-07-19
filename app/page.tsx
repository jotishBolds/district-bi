import Footer from "@/components/Footer";
import { HomeCarousel } from "@/components/HomeCarousel";
import HomeSearch from "@/components/HomeSearch";
import Navbar from "@/components/Navbar";
import NewsHighlights from "@/components/NewsHighlights";
import Link from "next/link";
import TrackApplicationPage from "./track/page";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <TrackApplicationPage />
      <Footer />
    </div>
  );
}
