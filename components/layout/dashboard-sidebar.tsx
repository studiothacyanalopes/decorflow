"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  ShoppingBag,
  KanbanSquare,
  Users,
  Package,
  Store,
  Wallet,
  BarChart3,
  UserCog,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Lock,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_MENU_ITEMS = [
  { label: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pedidos", href: "/dashboard/pedidos", icon: ShoppingBag },
  { label: "Fluxo", href: "/dashboard/fluxo", icon: KanbanSquare },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Produtos", href: "/dashboard/produtos", icon: Package },
  { label: "Catálogo", href: "/dashboard/catalogo", icon: Store },
  { label: "Financeiro", href: "/dashboard/financeiro", icon: Wallet },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
  { label: "Equipe", href: "/dashboard/equipe", icon: UserCog },
  { label: "Empresa", href: "/dashboard/empresa", icon: Building2 },
  { label: "Assinatura", href: "/dashboard/assinatura", icon: CreditCard },
];

type DashboardSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isSubscriptionLocked?: boolean;
};

export function DashboardSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  isSubscriptionLocked = false,
}: DashboardSidebarProps) {
const pathname = usePathname();
const [companyName, setCompanyName] = useState("Minha empresa");
const [isMasterUser, setIsMasterUser] = useState(false);

  useEffect(() => {
    async function loadCompanyName() {
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) return;

setIsMasterUser(
  String(user.email || "").trim().toLowerCase() ===
    "genesismatheusdsl@gmail.com"
);

      const { data: membership } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership?.company_id) return;

      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", membership.company_id)
        .maybeSingle();

      if (company?.name) {
        setCompanyName(company.name);
      }
    }

    loadCompanyName();
  }, []);


  const menuItems = isMasterUser
  ? [
      ...BASE_MENU_ITEMS,
      { label: "Master", href: "/dashboard/master", icon: Crown },
    ]
  : BASE_MENU_ITEMS;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition md:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all dark:border-white/10 dark:bg-[#07111f]/95 dark:shadow-[0_24px_80px_rgba(2,6,23,0.55)]",
          "md:z-30",
          collapsed ? "md:w-[96px]" : "md:w-[290px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "w-[290px]"
        )}
      >
        <div className="flex h-20 items-center border-b border-slate-200/70 px-4 dark:border-white/10">
          <div
            className={cn(
              "flex items-center",
              collapsed ? "w-full justify-center" : "gap-3"
            )}
          >
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1d4ed8_100%)] text-white shadow-[0_14px_30px_rgba(15,23,42,0.28)]">
              <span className="text-sm font-bold tracking-[0.08em]">DF</span>
              <div className="absolute inset-x-2 bottom-1 h-4 rounded-full bg-blue-400/20 blur-md" />
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">
                  DecorFlow
                </p>
                <h2 className="truncate text-[15px] font-semibold text-slate-950 dark:text-slate-100">
                  {companyName}
                </h2>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSubscriptionLocked && !collapsed ? (
          <div className="px-3 pt-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Acesso bloqueado
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Os módulos ficam visíveis, mas apenas a aba Assinatura está
                    liberada até a assinatura de um plano.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              const isAssinatura = item.href === "/dashboard/assinatura";
              const isDisabled = isSubscriptionLocked && !isAssinatura;

              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    className={cn(
                      "group relative flex cursor-not-allowed items-center rounded-2xl px-3 py-3 text-sm font-medium opacity-55 transition-all",
                      collapsed ? "justify-center" : "gap-3",
                      "border border-transparent bg-slate-100/80 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                    )}
                    title={
                      collapsed
                        ? `${item.label} bloqueado até ativar o plano`
                        : undefined
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />

                    {!collapsed ? <span>{item.label}</span> : null}

                    {!collapsed ? (
                      <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        <Lock className="h-3 w-3" />
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "group relative flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                    collapsed ? "justify-center" : "gap-3",
                    isActive
                      ? "bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1d4ed8_100%)] text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-950 dark:group-hover:text-white"
                    )}
                  />

                  {!collapsed ? <span>{item.label}</span> : null}

                  {isActive && !collapsed ? (
                    <div className="ml-auto h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200/70 p-3 dark:border-white/10">
          <div
            className={cn(
              "rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))]",
              collapsed && "p-3"
            )}
          >
            {collapsed ? (
              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Empresa
                </p>
                <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {companyName}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Dados principais da sua empresa vinculada.
                </p>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-4 top-24 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition hover:scale-105 hover:text-slate-950 md:inline-flex dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:text-white"
          aria-label={collapsed ? "Expandir painel" : "Recolher painel"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>
    </>
  );
}