"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-[#000000] dark:text-white">
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          collapsed ? "md:pl-[96px]" : "md:pl-[290px]"
        )}
      >
        <DashboardHeader
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}