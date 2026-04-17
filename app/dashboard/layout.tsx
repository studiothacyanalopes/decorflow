"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type CompanyAccessContext = {
  plan?: string | null;
  plan_status?: string | null;
  billing_status?: string | null;
  billing_cycle_ends_at?: string | null;
};

const PAID_PLANS = new Set(["start", "pro", "enterprise"]);
const ACTIVE_BILLING_STATUSES = new Set([
  "active",
  "approved",
  "paid",
  "authorized",
  "in_payment",
  "cobrança em dia",
]);

function isDateValid(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isSubscriptionActive(company: CompanyAccessContext | null) {
  if (!company) return false;

  const plan = (company.plan || "").toLowerCase().trim();
  const billingStatus = (company.billing_status || "").toLowerCase().trim();
  const planStatus = (company.plan_status || "").toLowerCase().trim();

  if (!PAID_PLANS.has(plan)) {
    return false;
  }

  if (planStatus.includes("free") || planStatus.includes("trial")) {
    return false;
  }

  if (billingStatus && !ACTIVE_BILLING_STATUSES.has(billingStatus)) {
    return false;
  }

  if (!isDateValid(company.billing_cycle_ends_at)) {
    return false;
  }

  const cycleEnd = new Date(company.billing_cycle_ends_at as string);
  const now = new Date();

  return cycleEnd.getTime() > now.getTime();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

const MASTER_EMAIL = "genesismatheusdsl@gmail.com";

const isSubscriptionRoute = useMemo(() => {
  return (
    pathname === "/dashboard/assinatura" ||
    pathname.startsWith("/dashboard/assinatura/")
  );
}, [pathname]);

const isMasterRoute = useMemo(() => {
  return pathname === "/dashboard/master" || pathname.startsWith("/dashboard/master/");
}, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function validateAccess() {
      try {
        setCheckingAccess(true);

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  router.replace("/login");
  return;
}

const isMasterUser =
  String(user.email || "").trim().toLowerCase() === MASTER_EMAIL.toLowerCase();

if (isMasterRoute && isMasterUser) {
  setHasActiveSubscription(true);
  return;
}

if (isMasterRoute && !isMasterUser) {
  router.replace("/dashboard");
  return;
}

        const { data: membership, error: membershipError } = await supabase
          .from("company_users")
          .select(
            "company_id, companies:company_id(plan, plan_status, billing_status, billing_cycle_ends_at)"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError || !membership?.company_id) {
          if (!mounted) return;
          setHasActiveSubscription(false);

          if (!isSubscriptionRoute) {
            router.replace("/dashboard/assinatura");
          }
          return;
        }

        const companyData = Array.isArray(membership.companies)
          ? membership.companies[0]
          : membership.companies;

        const allowed = isSubscriptionActive(companyData || null);

        if (!mounted) return;

        setHasActiveSubscription(allowed);

        if (!allowed && !isSubscriptionRoute) {
          router.replace("/dashboard/assinatura");
        }
      } finally {
        if (mounted) {
          setCheckingAccess(false);
        }
      }
    }

    validateAccess();

    return () => {
      mounted = false;
    };
  }, [isSubscriptionRoute, isMasterRoute, pathname, router]);

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-6 text-slate-900 dark:bg-[#000000] dark:text-white">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validando assinatura...
        </div>
      </div>
    );
  }

  const isLocked = !hasActiveSubscription;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-[#000000] dark:text-white">
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        isSubscriptionLocked={isLocked}
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

        {isLocked ? (
          <div className="px-4 pt-4 sm:px-5 lg:px-6">
            <div className="mb-4 flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800 shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100">
                <Lock className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Seu acesso aos módulos está bloqueado até a ativação do plano
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-700">
                  O menu continua visível para apresentar a estrutura do
                  DecorFlow, mas somente a aba <strong>Assinatura</strong> fica
                  liberada até escolher um plano.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <main className="relative px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}