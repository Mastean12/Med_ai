import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showImage?: boolean;
  className?: string;
};

const sizeMap: Record<string, { text: string; img: string }> = {
  sm: { text: "text-lg", img: "h-6 w-6" },
  md: { text: "text-2xl", img: "h-8 w-8" },
  lg: { text: "text-3xl", img: "h-10 w-10" },
  xl: { text: "text-4xl", img: "h-12 w-12" },
  hero: { text: "text-5xl sm:text-7xl", img: "h-14 w-14 sm:h-20 sm:w-20" },
};

export default function BrandLogo({ size = "md", showImage = false, className }: BrandLogoProps) {
  const s = sizeMap[size] || sizeMap.md;

  if (showImage) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <img src="/logo.png" alt="Medaitutor" className={cn("rounded-lg object-contain", s.img)} />
        <span className={cn("font-extrabold tracking-[-0.02em] antialiased", s.text)}>
          <span style={{ color: "#0B123F" }}>Medai</span>
          <span className="bg-gradient-to-r from-[#5B5CEB] to-[#8B5CF6] bg-clip-text text-transparent">tutor</span>
        </span>
      </div>
    );
  }

  return (
    <span className={cn("font-extrabold tracking-[-0.02em] antialiased", className, s.text)}>
      <span style={{ color: "#0B123F" }}>Medai</span>
      <span className="bg-gradient-to-r from-[#5B5CEB] to-[#8B5CF6] bg-clip-text text-transparent">tutor</span>
    </span>
  );
}
