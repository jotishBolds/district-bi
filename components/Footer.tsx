import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Image
              src="/assets/Seal_of_Sikkim_red.svg"
              alt="Seal of Sikkim"
              width={32}
              height={32}
              className="w-8 h-8 flex-shrink-0"
              quality={95}
            />
            <h6 className="text-sm font-semibold text-white">
              District Administrative Centre
            </h6>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            © {new Date().getFullYear()} District Administrative Centre,
            Gangtok. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
