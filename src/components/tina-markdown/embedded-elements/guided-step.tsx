"use client";

import { formatHeaderId } from "@/utils/docs";
import { LinkIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";
import { tinaField } from "tinacms/dist/react";

interface GuidedStepProps {
  stepNumber: number;
  section?: string;
  headingLevel?: string;
}

const styles: Record<number, string> = {
  3: "text-brand-primary text-2xl !mt-8 mb-2 font-light",
  4: "text-brand-primary text-xl !mt-8 mb-2 font-light",
  5: "text-brand-primary text-lg !mt-2 mb-1 font-light",
  6: "text-neutral-text-secondary text-base font-normal mt-2 mb-1",
};

const linkStyle: Record<number, string> = {
  3: "text-brand-primary size-6",
  4: "text-brand-primary size-6",
  5: "text-brand-primary size-4",
  6: "text-neutral-text-secondary size-4",
};

export default function GuidedStep({ stepNumber, section, headingLevel }: GuidedStepProps) {
  const level = Number.parseInt(headingLevel?.replace("h", "") || "4", 10);
  const HeadingTag = `h${level}` as any;

  const sectionSlug = section ? formatHeaderId(section) : "";
  const id = sectionSlug ? `${sectionSlug}-step-${stepNumber}` : `step-${stepNumber}`;
  const linkHref = `#${id}`;

  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const offset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  }, []);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    scrollToElement(id);
    window.history.pushState(null, "", linkHref);
  };

  return (
    <HeadingTag
      id={id}
      className={`${styles[level] || styles[4]} guided-step group relative cursor-pointer`}
      data-step={stepNumber}
      data-section={sectionSlug || undefined}
      data-tina-field={tinaField({ stepNumber, section, headingLevel }, "stepNumber")}
    >
      <a href={linkHref} className="inline-block no-underline" onClick={handleClick}>
        Step {stepNumber}
        <LinkIcon
          className={`${
            linkStyle[level] || linkStyle[4]
          } group-hover:animate-wiggle absolute ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-80`}
          style={{ display: "inline-block", marginTop: "0.25rem" }}
        />
      </a>
    </HeadingTag>
  );
}
