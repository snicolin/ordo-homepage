"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 group cursor-pointer w-full text-left"
      >
        <h2 className="typo-heading-lg">{title}</h2>
        <ChevronRight
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
