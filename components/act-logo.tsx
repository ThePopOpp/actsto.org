import Image from "next/image";

import { ACT_LOGO_DARK, ACT_LOGO_LIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ActLogoProps = {
  /** Force the dark-background variant regardless of site theme (e.g. footer's always-navy background). */
  background?: "theme" | "dark";
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/** Full wordmark logo. Swaps light/dark variants via CSS so it works in server components with no hydration flicker. */
export function ActLogo({ background = "theme", className, sizes, priority }: ActLogoProps) {
  if (background === "dark") {
    return (
      <Image
        src={ACT_LOGO_DARK}
        alt="Arizona Christian Tuition"
        fill
        className={cn("object-contain object-left", className)}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <>
      <Image
        src={ACT_LOGO_LIGHT}
        alt="Arizona Christian Tuition"
        fill
        className={cn("object-contain object-left dark:hidden", className)}
        sizes={sizes}
        priority={priority}
      />
      <Image
        src={ACT_LOGO_DARK}
        alt="Arizona Christian Tuition"
        fill
        className={cn("hidden object-contain object-left dark:block", className)}
        sizes={sizes}
        priority={priority}
      />
    </>
  );
}
