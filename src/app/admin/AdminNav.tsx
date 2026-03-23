"use client";

import { usePathname } from "next/navigation";
import PillNav from "@/components/PillNav";

export default function AdminNav() {
  const pathname = usePathname();
  const activeKey = pathname.startsWith("/admin/ai")
    ? "ai"
    : pathname.startsWith("/admin/users")
      ? "users"
      : pathname.startsWith("/admin/alerts")
        ? "alerts"
        : "content";

  return (
    <PillNav
      items={[
        { key: "content", label: "Content", href: "/admin" },
        { key: "alerts", label: "Alerts", href: "/admin/alerts" },
        { key: "users", label: "Users", href: "/admin/users" },
        { key: "ai", label: "AI", href: "/admin/ai" },
      ]}
      activeKey={activeKey}
    />
  );
}
