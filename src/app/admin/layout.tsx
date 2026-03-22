import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { requireSession, getDisplayName } from "@/auth";
import AppHeader from "@/components/AppHeader";
import AdminNav from "./AdminNav";
import { containerClass } from "@/lib/styles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const admin = await isAdmin();
  if (!admin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={getDisplayName(session)}
        isAdmin={true}
        isOnAdmin={true}
        badge="Admin"
      />
        <div className={`${containerClass} py-6 pb-24`}>
        <div className="mb-6">
          <AdminNav />
        </div>
        {children}
      </div>
    </div>
  );
}
