import Footer from "@/components/Footer";
import { HomeCarousel } from "@/components/HomeCarousel";
import HomeSearch from "@/components/HomeSearch";
import Navbar from "@/components/Navbar";
import NewsHighlights from "@/components/NewsHighlights";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HomeSearch />
      <HomeCarousel />
      <NewsHighlights />

      {/* Main Services Section */}
      <section className="bg-[#1170CD] w-full py-12 lg:py-16 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-stretch md:justify-center gap-8 md:gap-0">
            {/* Online Applications */}
            <div className="flex flex-col items-center justify-center p-6 text-center flex-1">
              <div className="bg-white rounded-full p-4 sm:p-5 mb-6 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  className="sm:w-12 sm:h-12"
                  fill="#1170CD"
                >
                  <path d="M19 22H5C3.34315 22 2 20.6569 2 19V3C2 2.44772 2.44772 2 3 2H17C17.5523 2 18 2.44772 18 3V15H22V19C22 20.6569 20.6569 22 19 22ZM18 17V19C18 19.5523 18.4477 20 19 20C19.5523 20 20 19.5523 20 19V17H18ZM16 20V4H4V19C4 19.5523 4.44772 20 5 20H16ZM6 7H14V9H6V7ZM6 11H14V13H6V11ZM6 15H11V17H6V15Z"></path>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                Online Applications
              </h3>
              <p className="text-sm sm:text-base mb-6 max-w-sm leading-relaxed opacity-90">
                Apply for certificates and services online without visiting
                offices
              </p>
              <Link
                href="/services"
                className="bg-white text-[#1170CD] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-md"
              >
                Apply Now
              </Link>
            </div>
            {/* Divider */}
            <div className="hidden md:block h-24 w-px bg-white/40 self-center mx-4"></div>
            {/* Track Applications */}
            <div className="flex flex-col items-center justify-center p-6 text-center flex-1">
              <div className="bg-white rounded-full p-4 sm:p-5 mb-6 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  className="sm:w-12 sm:h-12"
                  fill="#1170CD"
                >
                  <path d="M20.9993 10.9C20.9993 14.7577 18.2806 17.9286 14.5716 18.4368L14.2583 16.4644C16.9673 16.0558 18.9993 13.7031 18.9993 10.9C18.9993 7.69235 16.407 5.1 13.1993 5.1C9.99171 5.1 7.39935 7.69235 7.39935 10.9C7.39935 13.7031 9.43139 16.0558 12.1404 16.4644L11.8271 18.4368C8.11806 17.9286 5.39935 14.7577 5.39935 10.9C5.39935 6.59 8.88936 3.1 13.1993 3.1C17.5093 3.1 20.9993 6.59 20.9993 10.9ZM13 8H15V11H18V13H15V16H13V13H10V11H13V8Z"></path>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                Track Applications
              </h3>
              <p className="text-sm sm:text-base mb-6 max-w-sm leading-relaxed opacity-90">
                Check the status of your applications and get updates instantly
              </p>
              <Link
                href="/login"
                className="bg-white text-[#1170CD] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-md"
              >
                Track Now
              </Link>
            </div>
            {/* Divider */}
            <div className="hidden md:block h-24 w-px bg-white/40 self-center mx-4"></div>
            {/* Real-Time Updates */}
            <div className="flex flex-col items-center justify-center p-6 text-center flex-1">
              <div className="bg-white rounded-full p-4 sm:p-5 mb-6 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  className="sm:w-12 sm:h-12"
                  fill="#1170CD"
                >
                  <path d="M8.00008 16C6.33719 16 5.00008 17.3371 5.00008 19C5.00008 20.6629 6.33719 22 8.00008 22H16.0001C17.663 22 19.0001 20.6629 19.0001 19C19.0001 17.3371 17.663 16 16.0001 16H8.00008ZM2.39391 14.5304L4.39391 13.5304C4.77881 13.3378 5.24774 13.4701 5.4403 13.855C5.63285 14.2399 5.50053 14.7088 5.11563 14.9014L3.11563 15.9014C2.73073 16.0939 2.2618 15.9616 2.06925 15.5767C1.87669 15.1918 2.00902 14.7229 2.39391 14.5304ZM21.6063 15.9014L19.6063 14.9014C19.2214 14.7088 19.0891 14.2399 19.2816 13.855C19.4742 13.4701 19.9431 13.3378 20.328 13.5304L22.328 14.5304C22.7129 14.7229 22.8452 15.1918 22.6527 15.5767C22.4601 15.9616 21.9912 16.0939 21.6063 15.9014ZM12.0001 2C7.57865 2 3.99996 5.57869 3.99996 10C3.99996 14.4213 7.57865 18 12.0001 18C16.4214 18 20.0001 14.4213 20.0001 10C20.0001 5.57869 16.4214 2 12.0001 2ZM12.0001 4C15.3138 4 18.0001 6.68629 18.0001 10C18.0001 13.3137 15.3138 16 12.0001 16C8.68637 16 6.00008 13.3137 6.00008 10C6.00008 6.68629 8.68637 4 12.0001 4ZM11.0001 6V10.4142L13.2931 12.7071L14.7073 11.2929L13.0001 9.58579V6H11.0001Z"></path>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3">
                Real-Time Updates
              </h3>
              <p className="text-sm sm:text-base mb-6 max-w-sm leading-relaxed opacity-90">
                Receive notifications and timely updates on application
                processing
              </p>
              <Link
                href="/notifications"
                className="bg-white text-[#1170CD] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-md"
              >
                View Updates
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Services Cards Section */}
      <section className="w-full py-12 lg:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
              Additional Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore our comprehensive range of digital services designed to
              make government processes more accessible and efficient.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Card 1 - Document Storage */}
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center group">
              <div className="bg-[#dc523c] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="white"
                >
                  <path d="M3.08697 9H20.9134C21.4657 9 21.9134 9.44772 21.9134 10C21.9134 10.0277 21.9122 10.0554 21.9099 10.083L21.0766 20.083C21.0334 20.6013 20.6001 21 20.08 21H3.9203C3.40021 21 2.96695 20.6013 2.92376 20.083L2.09042 10.083C2.04456 9.53267 2.45355 9.04932 3.00392 9.00345C3.03155 9.00115 3.05925 9 3.08697 9ZM4.84044 19H19.1599L19.8266 11H4.17377L4.84044 19ZM13.4144 5H20.0002C20.5525 5 21.0002 5.44772 21.0002 6V7H3.00017V4C3.00017 3.44772 3.44789 3 4.00017 3H11.4144L13.4144 5Z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                Document Storage
              </h3>
              <div className="w-12 h-px bg-gray-300 mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Securely store and access all your important documents digitally
                with our encrypted storage system.
              </p>
            </div>

            {/* Card 2 - Support Center */}
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center group">
              <div className="bg-[#00994d] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="white"
                >
                  <path d="M22 17.0022C21.999 19.8731 19.9816 22.2726 17.2872 22.8616L16.6492 20.9476C17.8532 20.7511 18.8765 20.0171 19.4649 19H17C15.8954 19 15 18.1046 15 17V13C15 11.8954 15.8954 11 17 11H19.9381C19.446 7.05369 16.0796 4 12 4C7.92038 4 4.55399 7.05369 4.06189 11H7C8.10457 11 9 11.8954 9 13V17C9 18.1046 8.10457 19 7 19H4C2.89543 19 2 18.1046 2 17V12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12V12.9987V13V17V17.0013V17.0022Z"></path>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                Support Center
              </h3>
              <div className="w-12 h-px bg-gray-300 mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Get assistance with applications and queries through our
                dedicated 24/7 helpdesk support.
              </p>
            </div>

            {/* Card 3 - Schedule Appointments */}
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center group">
              <div className="bg-[#004a99] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="white"
                >
                  <path d="M17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9V3H15V1H17V3ZM4 9V19H20V9H4ZM6 11H8V13H6V11ZM6 15H8V17H6V15ZM10 11H18V13H10V11ZM10 15H15V17H10V15Z"></path>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                Schedule Appointments
              </h3>
              <div className="w-12 h-px bg-gray-300 mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Book appointments with government officials for in-person
                meetings and consultations.
              </p>
            </div>

            {/* Card 4 - Payment Portal */}
            <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center group">
              <div className="bg-[#d1bb3b] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="white"
                >
                  <path d="M13.5011 4.39885C14.7217 5.10357 15.2612 6.53847 14.8826 7.83501L16.8025 8.3956C17.4334 6.23483 16.5385 3.8431 14.5011 2.6668C12.1096 1.28609 9.05169 2.10547 7.67098 4.49693C6.4615 6.59181 6.94024 9.19811 8.68509 10.7404L6.80304 14.0002L6.7998 14.0002C5.69524 14.0002 4.7998 14.8957 4.7998 16.0002C4.7998 17.1048 5.69524 18.0002 6.7998 18.0002C7.90437 18.0002 8.7998 17.1048 8.7998 16.0002C8.7998 15.8408 8.78115 15.6857 8.7459 15.537C8.66351 15.1896 8.64362 14.8123 8.82215 14.503L11.3671 10.095L10.5011 9.59501C9.06623 8.76658 8.5746 6.93181 9.40303 5.49693C10.2315 4.06205 12.0662 3.57043 13.5011 4.39885ZM15.0313 18.0802C15.9648 19.0563 17.4772 19.3066 18.6978 18.6018C20.1327 17.7734 20.6243 15.9387 19.7959 14.5038C18.9675 13.0689 17.1327 12.5773 15.6978 13.4057L14.8318 13.9057L12.2864 9.49688C12.1079 9.18768 11.7711 9.01623 11.4291 8.91386C11.2827 8.87005 11.1391 8.80868 11.0011 8.72897C10.0445 8.17668 9.71673 6.9535 10.269 5.99692C10.8213 5.04033 12.0445 4.71258 13.0011 5.26487C13.9577 5.81715 14.2854 7.04033 13.7331 7.99692L13.7314 7.99981L15.6139 11.2603C17.822 10.5203 20.3185 11.4089 21.528 13.5038C22.9087 15.8952 22.0893 18.9532 19.6978 20.3339C17.6604 21.5102 15.1417 21.0893 13.5859 19.4625L15.0313 18.0802ZM3.7998 16.0005C3.7998 14.5911 4.77271 13.4064 6.08484 13.086L5.61041 11.1431C3.42366 11.677 1.7998 13.6479 1.7998 16.0005C1.7998 18.7619 4.03838 21.0005 6.7998 21.0005C9.21876 21.0005 11.2365 19.2827 11.6998 17.0005H15.4641L15.4658 17.0036C16.0181 17.9602 17.2413 18.2879 18.1979 17.7356C19.1545 17.1833 19.4822 15.9602 18.9299 15.0036C18.3776 14.047 17.1545 13.7192 16.1979 14.2715C16.0598 14.3512 15.9349 14.4449 15.8238 14.5497C15.5642 14.7947 15.2474 15.0005 14.8904 15.0005H9.7998V16.0005C9.7998 17.6574 8.45666 19.0005 6.7998 19.0005C5.14295 19.0005 3.7998 17.6574 3.7998 16.0005Z"></path>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                Payment Portal
              </h3>
              <div className="w-12 h-px bg-gray-300 mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Make secure online payments for government services and fees
                with multiple payment options.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
