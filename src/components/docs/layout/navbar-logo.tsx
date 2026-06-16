"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface NavbarLogoProps {
  navigationDocsData: any;
}

export const NavbarLogo = ({ navigationDocsData }: NavbarLogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lightLogo = navigationDocsData[0]?.lightModeLogo || null;
  const darkLogo = navigationDocsData[0]?.darkModeLogo || lightLogo;

  const activeLogo = resolvedTheme === "dark" ? darkLogo : lightLogo;
  const preloadLogo = resolvedTheme === "dark" ? lightLogo : darkLogo;

  return (
    <Link href="/" className="flex items-center">
      <div className="relative md:w-[120px] w-[90px] h-[40px]">
        {mounted && activeLogo ? (
          <>
            <Image
              src={activeLogo}
              alt="Logo"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 90px, 120px"
            />
            {/* Preload the other logo */}
            {preloadLogo && <Image src={preloadLogo} alt="" fill className="hidden" priority />}
          </>
        ) : (
          <div className="w-full h-full animate-pulse opacity-20" />
        )}
      </div>
    </Link>
  );
};
