"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Upload,
  User,
  UserCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onOpenMobile: () => void;
};

export function DashboardHeader({
  collapsed,
  mobileOpen,
  onOpenMobile,
}: DashboardHeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  const storedTheme = localStorage.getItem("decorflow-theme");
  const shouldUseDark = storedTheme === "dark";

  setDarkMode(shouldUseDark);
  document.documentElement.classList.toggle("dark", shouldUseDark);
}, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

function toggleTheme() {
  const next = !darkMode;

  setDarkMode(next);
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("decorflow-theme", next ? "dark" : "light");
}

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#07111f]/85">
      <div className="flex h-[76px] items-center gap-3 px-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              DecorFlow
            </p>
            <h1 className="truncate text-[28px] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
              Dashboard
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar pedidos, clientes, produtos..."
                className="h-12 w-[320px] rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-white/10"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Alternar tema"
            title="Alternar tema"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            className="hidden h-11 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1d4ed8_100%)] px-4 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Novo pedido
          </button>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={cn(
                "group inline-flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white pl-2.5 pr-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                userMenuOpen && "border-blue-500/40 ring-4 ring-blue-500/10"
              )}
            >
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1d4ed8_100%)] text-sm font-bold text-white shadow-sm">
                GE
              </div>

              <div className="hidden sm:block">
                <p className="max-w-[110px] truncate text-sm font-semibold text-slate-950 dark:text-white">
                  genesis
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Administrador
                </p>
              </div>

              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-400 transition dark:text-slate-500",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "absolute right-0 top-[calc(100%+12px)] w-[260px] origin-top-right rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_30px_80px_rgba(15,23,42,0.18)] transition-all dark:border-white/10 dark:bg-[#0b1220]",
                userMenuOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0"
              )}
            >
              <div className="rounded-2xl bg-[linear-gradient(135deg,#eff6ff_0%,#eef2ff_100%)] p-3 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.75),rgba(15,23,42,0.95))]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1d4ed8_100%)] text-sm font-bold text-white">
                    GE
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      genesis
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      Administrador
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <User className="h-4 w-4" />
                  Meu perfil
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Upload className="h-4 w-4" />
                  Alterar foto
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <UserCircle2 className="h-4 w-4" />
                  Incluir foto
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <XCircle className="h-4 w-4" />
                  Remover foto
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  Preferências
                </button>
              </div>

              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-white/10">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-4 py-3 lg:hidden dark:border-white/10">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar pedidos, clientes, produtos..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-white/10"
          />
        </div>
      </div>
    </header>
  );
}