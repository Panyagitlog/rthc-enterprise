import type { ImgHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type DMCFSLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  /** "full" = emblem + wordmark, "mark" = emblem only (square, good for compact spaces) */
  variant?: "full" | "mark";
  /** Preset height so the logo scales consistently across the UI */
  size?: "xs" | "sm" | "md" | "lg";
};

const SOURCES: Record<NonNullable<DMCFSLogoProps["variant"]>, string> = {
  full: "/dmcfs.png",
  mark: "/dmcfs-mark.png",
};

const SIZE_CLASSES: Record<NonNullable<DMCFSLogoProps["size"]>, string> = {
  xs: "h-6",
  sm: "h-8",
  md: "h-11",
  lg: "h-16",
};

export default function DMCFSLogo({
  className,
  variant = "full",
  size = "sm",
  ...props
}: DMCFSLogoProps) {
  return (
    <span className="dmcfs-logo relative inline-flex overflow-hidden align-middle">
      <img
        src={SOURCES[variant]}
        alt="DMCFS Pvt. Ltd."
        className={cn("dmcfs-logo__image block h-auto w-auto object-contain", SIZE_CLASSES[size], className)}
        {...props}
      />
      <span
        aria-hidden="true"
        className="dmcfs-logo__shine pointer-events-none absolute inset-0"
        style={{ maskImage: `url("${SOURCES[variant]}")`, WebkitMaskImage: `url("${SOURCES[variant]}")` }}
      />
    </span>
  );
}
