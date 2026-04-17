"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  Crown,
  DollarSign,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";

const MASTER_EMAIL = "genesismatheusdsl@gmail.com";

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
  slug: string | null;
  created_at: string | null;
  plan: string | null;
  plan_status: string | null;
  billing_status: string | null;
  billing_cycle_ends_at: string | null;
  trial_ends_at: string | null;
};

type CompanyUserRow = {
  company_id: string;
  user_id: string | null;
  role: string | null;
  member_status: string | null;
  display_name: string | null;
  invite_email: string | null;
  joined_at: string | null;
  invited_at: string | null;
};

type OrderRow = {
  id: string;
  company_id: string;
  order_number: string | null;
  client_name: string | null;
  client_phone: string | null;
  total_amount: number | null;
  extra_cost_total: number | null;
  order_status: string | null;
  delivery_status: string | null;
  contract_status: string | null;
  event_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProductRow = {
  id: string;
  company_id: string;
  name: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  created_at: string | null;
};

type CategoryRow = {
  id: string;
  company_id: string;
  name: string | null;
  is_active: boolean | null;
};

type SubcategoryRow = {
  id: string;
  company_id: string;
  name: string | null;
  is_active: boolean | null;
};

type CompanyMasterCard = {
  id: string;
  name: string;
  slug: string;
  createdAt: string | null;
  plan: string;
  planStatus: string;
  billingStatus: string;
  billingCycleEndsAt: string | null;
  trialEndsAt: string | null;
  usersCount: number;
  activeUsersCount: number;
  ordersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  clientsCount: number;
  productsCount: number;
  activeProductsCount: number;
  featuredProductsCount: number;
  categoriesCount: number;
  subcategoriesCount: number;
  grossRevenue: number;
  extraCosts: number;
  estimatedProfit: number;
  averageTicket: number;
  lastOrderAt: string | null;
};

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function safeNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function StatCard({
  title,
  value,
  icon: Icon,
  helper,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-xs text-slate-500">{helper}</p>
          ) : null}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Badge({
  text,
  tone = "slate",
}: {
  text: string;
  tone?: "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";
}) {
  const map = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}
    >
      {text}
    </span>
  );
}

function planTone(plan: string) {
  const value = normalizeText(plan);

  if (value === "enterprise") return "violet" as const;
  if (value === "pro") return "blue" as const;
  if (value === "start") return "emerald" as const;
  if (value === "free") return "slate" as const;
  return "amber" as const;
}

function billingTone(status: string) {
  const value = normalizeText(status);

  if (["active", "paid", "approved", "cobrança em dia"].includes(value)) {
    return "emerald" as const;
  }

  if (["pending", "trialing", "grace"].includes(value)) {
    return "amber" as const;
  }

  if (["blocked", "expired", "cancelled"].includes(value)) {
    return "rose" as const;
  }

  return "slate" as const;
}

export default function DecorMasterPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusState>({
    type: "",
    message: "",
  });
  const [accessDenied, setAccessDenied] = useState(false);

  const [sessionEmail, setSessionEmail] = useState("");
  const [companies, setCompanies] = useState<CompanyMasterCard[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      setLoading(true);
      setStatus({ type: "", message: "" });
      setAccessDenied(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        setAccessDenied(true);
        setStatus({
          type: "error",
          message: "Não foi possível validar o usuário logado.",
        });
        return;
      }

      setSessionEmail(user.email);

      if (normalizeText(user.email) !== normalizeText(MASTER_EMAIL)) {
        setAccessDenied(true);
        setStatus({
          type: "error",
          message: "Apenas o e-mail master pode acessar este painel.",
        });
        return;
      }

const response = await fetch("/api/master/overview", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    userEmail: user.email,
  }),
});

const result = await response.json().catch(() => null);

if (!response.ok || !result?.ok) {
  throw new Error(result?.error || "Não foi possível carregar o painel master.");
}

const mapped = Array.isArray(result?.companies) ? result.companies : [];

setCompanies(mapped);

setStatus({
  type: "success",
  message: `Painel master carregado com ${mapped.length} empresa(s).`,
});
    } finally {
      setLoading(false);
    }
  }

  const filteredCompanies = useMemo(() => {
    const term = normalizeText(search);

    if (!term) return companies;

    return companies.filter((company) => {
      return (
        normalizeText(company.name).includes(term) ||
        normalizeText(company.slug).includes(term) ||
        normalizeText(company.plan).includes(term) ||
        normalizeText(company.billingStatus).includes(term)
      );
    });
  }, [companies, search]);

  const summary = useMemo(() => {
    const totalCompanies = companies.length;
    const freeCount = companies.filter((item) => normalizeText(item.plan) === "free").length;
    const startCount = companies.filter((item) => normalizeText(item.plan) === "start").length;
    const proCount = companies.filter((item) => normalizeText(item.plan) === "pro").length;
    const enterpriseCount = companies.filter((item) => normalizeText(item.plan) === "enterprise").length;

    const totalOrders = companies.reduce((acc, item) => acc + item.ordersCount, 0);
    const totalClients = companies.reduce((acc, item) => acc + item.clientsCount, 0);
    const totalRevenue = companies.reduce((acc, item) => acc + item.grossRevenue, 0);
    const totalCosts = companies.reduce((acc, item) => acc + item.extraCosts, 0);
    const totalProfit = companies.reduce((acc, item) => acc + item.estimatedProfit, 0);
    const totalProducts = companies.reduce((acc, item) => acc + item.productsCount, 0);

    return {
      totalCompanies,
      freeCount,
      startCount,
      proCount,
      enterpriseCount,
      totalOrders,
      totalClients,
      totalRevenue,
      totalCosts,
      totalProfit,
      totalProducts,
    };
  }, [companies]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando painel master...
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-base font-semibold">Acesso restrito</p>
              <p className="mt-2 text-sm leading-6">
                Este painel master é exclusivo para o usuário{" "}
                <strong>{MASTER_EMAIL}</strong>.
              </p>
              {sessionEmail ? (
                <p className="mt-2 text-sm">
                  Usuário atual: <strong>{sessionEmail}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
                Painel master
              </div>

              <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                Controle geral do DecorFlow
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                Visão central de empresas, planos, cobrança, operação, clientes,
                produtos e faturamento do sistema.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Acesso master</p>
              <p>{sessionEmail}</p>
            </div>
          </div>

          {status.message ? (
            <div
              className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard
              title="Empresas"
              value={String(summary.totalCompanies)}
              icon={Building2}
              helper="Total cadastrado"
            />
            <StatCard
              title="Clientes"
              value={String(summary.totalClients)}
              icon={Users}
              helper="Clientes únicos somados"
            />
            <StatCard
              title="Pedidos"
              value={String(summary.totalOrders)}
              icon={ShoppingBag}
              helper="Pedidos totais"
            />
            <StatCard
              title="Produtos"
              value={String(summary.totalProducts)}
              icon={Package}
              helper="Produtos cadastrados"
            />
            <StatCard
              title="Faturamento"
              value={formatCurrency(summary.totalRevenue)}
              icon={Wallet}
              helper="Soma de pedidos"
            />
            <StatCard
              title="Lucro estimado"
              value={formatCurrency(summary.totalProfit)}
              icon={DollarSign}
              helper="Faturamento - custos extras"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Free" value={String(summary.freeCount)} icon={BarChart3} />
            <StatCard title="Start" value={String(summary.startCount)} icon={CheckCircle2} />
            <StatCard title="Pro" value={String(summary.proCount)} icon={Crown} />
            <StatCard title="Enterprise" value={String(summary.enterpriseCount)} icon={Boxes} />
            <StatCard
              title="Custos extras"
              value={formatCurrency(summary.totalCosts)}
              icon={Wallet}
            />
          </div>

          <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Empresas do sistema
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Veja plano, cobrança, uso e faturamento por empresa.
                </p>
              </div>

              <div className="relative w-full lg:w-[340px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar empresa, plano, slug..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {company.name}
                        </h3>
                        <Badge text={company.plan} tone={planTone(company.plan)} />
                        <Badge
                          text={company.billingStatus}
                          tone={billingTone(company.billingStatus)}
                        />
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Slug: <strong>{company.slug}</strong> · Criada em{" "}
                        <strong>{formatDateTime(company.createdAt)}</strong>
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Plano status: <strong>{company.planStatus}</strong> ·
                        Próximo ciclo:{" "}
                        <strong>{formatDateTime(company.billingCycleEndsAt)}</strong> ·
                        Trial até: <strong>{formatDateTime(company.trialEndsAt)}</strong>
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      <Badge text={`Usuários: ${company.usersCount}`} tone="slate" />
                      <Badge text={`Ativos: ${company.activeUsersCount}`} tone="emerald" />
                      <Badge text={`Clientes: ${company.clientsCount}`} tone="blue" />
                      <Badge text={`Pedidos: ${company.ordersCount}`} tone="blue" />
                      <Badge text={`Concluídos: ${company.completedOrdersCount}`} tone="emerald" />
                      <Badge text={`Cancelados: ${company.cancelledOrdersCount}`} tone="rose" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <MiniStat label="Produtos" value={String(company.productsCount)} />
                    <MiniStat label="Produtos ativos" value={String(company.activeProductsCount)} />
                    <MiniStat label="Destaques" value={String(company.featuredProductsCount)} />
                    <MiniStat label="Categorias" value={String(company.categoriesCount)} />
                    <MiniStat label="Subcategorias" value={String(company.subcategoriesCount)} />
                    <MiniStat
                      label="Ticket médio"
                      value={formatCurrency(company.averageTicket)}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MiniMoney label="Faturamento" value={company.grossRevenue} />
                    <MiniMoney label="Custos extras" value={company.extraCosts} />
                    <MiniMoney label="Lucro estimado" value={company.estimatedProfit} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Última atividade operacional:{" "}
                    <strong className="text-slate-900">
                      {formatDateTime(company.lastOrderAt)}
                    </strong>
                  </div>
                </div>
              ))}

              {filteredCompanies.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma empresa encontrada para o filtro informado.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniMoney({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}