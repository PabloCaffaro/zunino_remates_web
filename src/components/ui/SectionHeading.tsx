import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  headingLevel = "h2",
  className = "",
}: SectionHeadingProps) {
  const Heading = headingLevel;

  return (
    <div className={`section-title reveal ${className}`.trim()}>
      <p className="eyebrow">{eyebrow}</p>
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
