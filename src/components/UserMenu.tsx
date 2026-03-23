"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserMenu({
  firstName,
  isAdmin,
  isOnAdmin,
  signOutAction,
}: {
  firstName: string;
  isAdmin?: boolean;
  isOnAdmin?: boolean;
  signOutAction: () => Promise<void>;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === "/") {
        e.preventDefault();
        router.push(isOnAdmin ? "/" : "/admin");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin, isOnAdmin, router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 typo-label text-foreground hover:text-foreground/80 cursor-pointer transition-colors outline-none">
        {firstName}
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 [[data-open]>&]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAdmin && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(isOnAdmin ? "/" : "/admin")}
          >
            {isOnAdmin ? "Back to HQ" : "Admin"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => signOutAction()}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
