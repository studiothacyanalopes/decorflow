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
  Trash2,
  Users,
  Wallet,
  Save,
  Shield,
  Globe,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

const MASTER_EMAIL = "genesismatheusdsl@gmail.com";

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

type CompanyMasterCard = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  document: string;
  businessType: string;
  createdAt: string | null;
  updatedAt: string | null;
  plan: string;
  planStatus: string;
  active: boolean;
  maxUsers: number;
  ownerNames: string[];
  ownerEmails: string[];
  instagram: string;
  whatsapp: string;
  emailPublico: string;
  addressLine: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  publicDescription: string;
  publicLogoUrl: string;
  publicCoverUrl: string;
  publicLinkEnabled: boolean;
  publicLinkTitle: string;
  publicLinkSubtitle: string;
  businessHours: string;
  mapsLink: string;
  deliveryEnabled: boolean;
  deliveryPricePerKm: number;
  deliveryMinimumFee: number;
  deliveryRoundTripMultiplier: number;
  deliveryMaxDistanceKm: number;
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

type EditMap = Record<
  string,
  {
    plan: string;
    planStatus: string;
    active: boolean;
    maxUsers: number;
  }
>;

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
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

function buildAddress(company: CompanyMasterCard) {
  return [
    company.addressLine,
    company.addressNumber,
    company.addressComplement,
    company.neighborhood,
    company.city,
    company.state,
    company.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
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
          {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}>
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

function statusTone(status: string) {
  const value = normalizeText(status);
  if (value === "active") return "emerald" as const;
  if (value === "trial") return "amber" as const;
  if (value === "blocked") return "rose" as const;
  if (value === "cancelled") return "slate" as const;
  return "slate" as const;
}

export default function DecorMasterPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [companies, setCompanies] = useState<CompanyMasterCard[]>([]);
  const [search, setSearch] = useState("");
  const [savingCompanyId, setSavingCompanyId] = useState<string | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<EditMap>({});

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

      const nextEditMap: EditMap = {};
      mapped.forEach((company: CompanyMasterCard) => {
        nextEditMap[company.id] = {
          plan: company.plan || "free",
          planStatus: company.planStatus || "trial",
          active: company.active ?? true,
          maxUsers: Number(company.maxUsers || 1),
        };
      });
      setEditMap(nextEditMap);

      setStatus({
        type: "success",
        message: `Painel master carregado com ${mapped.length} empresa(s).`,
      });
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error?.message || "Não foi possível carregar o painel master.",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateCompanyDraft(
    companyId: string,
    patch: Partial<EditMap[string]>
  ) {
    setEditMap((prev) => ({
      ...prev,
      [companyId]: {
        ...(prev[companyId] || {
          plan: "free",
          planStatus: "trial",
          active: true,
          maxUsers: 1,
        }),
        ...patch,
      },
    }));
  }

  async function handleSaveCompany(company: CompanyMasterCard) {
    try {
      setSavingCompanyId(company.id);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const draft = editMap[company.id];

      const response = await fetch("/api/master/company/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.email || "",
          companyId: company.id,
          plan: draft?.plan,
          planStatus: draft?.planStatus,
          active: draft?.active,
          maxUsers: draft?.maxUsers,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Não foi possível atualizar a empresa.");
      }

      setStatus({
        type: "success",
        message: `${company.name} atualizada com sucesso.`,
      });

      await bootstrap();
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error?.message || "Erro inesperado ao atualizar empresa.",
      });
    } finally {
      setSavingCompanyId(null);
    }
  }

  async function handleDeleteCompany(company: CompanyMasterCard) {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a empresa "${company.name}"?\n\nEssa ação tenta remover empresa, usuários, convites, categorias, subcategorias, produtos e pedidos vinculados.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingCompanyId(company.id);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch("/api/master/company/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.email || "",
          companyId: company.id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Não foi possível excluir a empresa.");
      }

      setStatus({
        type: "success",
        message: `${company.name} foi excluída com sucesso.`,
      });

      await bootstrap();
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error?.message || "Erro inesperado ao excluir empresa.",
      });
    } finally {
      setDeletingCompanyId(null);
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
        normalizeText(company.planStatus).includes(term) ||
        normalizeText(company.ownerNames.join(" ")).includes(term) ||
        normalizeText(company.ownerEmails.join(" ")).includes(term) ||
        normalizeText(company.whatsapp).includes(term) ||
        normalizeText(company.emailPublico).includes(term)
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
      <div className="mx-auto max-w-[1880px] px-4 py-4 sm:px-6 lg:px-8">
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
                Visão central de empresas, planos, operação, clientes, produtos,
                faturamento e controle administrativo.
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
                  Máximo de informação operacional e administrativa por empresa.
                </p>
              </div>

              <div className="relative w-full lg:w-[360px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar empresa, plano, slug, dono..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {filteredCompanies.map((company) => {
                const draft = editMap[company.id] || {
                  plan: company.plan,
                  planStatus: company.planStatus,
                  active: company.active,
                  maxUsers: company.maxUsers,
                };

                const publicUrl =
                  company.slug && company.slug !== "—"
                    ? `${typeof window !== "undefined" ? window.location.origin : ""}/empresa/${company.slug}`
                    : "";

                return (
                  <div
                    key={company.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">
                            {company.name}
                          </h3>
                          <Badge text={company.plan} tone={planTone(company.plan)} />
                          <Badge text={company.planStatus} tone={statusTone(company.planStatus)} />
                          <Badge text={company.active ? "ativa" : "inativa"} tone={company.active ? "emerald" : "rose"} />
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          ID: <strong>{company.id}</strong>
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Slug: <strong>{company.slug}</strong> · Criada em{" "}
                          <strong>{formatDateTime(company.createdAt)}</strong> · Atualizada em{" "}
                          <strong>{formatDateTime(company.updatedAt)}</strong>
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Dono(s):{" "}
                          <strong>
                            {company.ownerNames.length > 0
                              ? company.ownerNames.join(", ")
                              : "—"}
                          </strong>
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          E-mail(s) do dono:{" "}
                          <strong>
                            {company.ownerEmails.length > 0
                              ? company.ownerEmails.join(", ")
                              : "—"}
                          </strong>
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
                      <MiniStat label="Ticket médio" value={formatCurrency(company.averageTicket)} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MiniMoney label="Faturamento" value={company.grossRevenue} />
                      <MiniMoney label="Custos extras" value={company.extraCosts} />
                      <MiniMoney label="Lucro estimado" value={company.estimatedProfit} />
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <InfoPanel
                        title="Informações da empresa"
                        rows={[
                          { label: "Tipo de negócio", value: company.businessType || "—" },
                          { label: "Documento", value: company.document || "—" },
                          { label: "E-mail interno", value: company.email || "—" },
                          { label: "Telefone", value: company.phone || "—" },
                          { label: "Instagram", value: company.instagram || "—" },
                          { label: "WhatsApp", value: company.whatsapp || "—" },
                          { label: "E-mail público", value: company.emailPublico || "—" },
                          { label: "Link público", value: company.publicLinkEnabled ? "Ativo" : "Inativo" },
                        ]}
                      />

                      <InfoPanel
                        title="Catálogo / entrega / presença"
                        rows={[
                          { label: "Título público", value: company.publicLinkTitle || "—" },
                          { label: "Subtítulo público", value: company.publicLinkSubtitle || "—" },
                          { label: "Horário", value: company.businessHours || "—" },
                          { label: "Entrega", value: company.deliveryEnabled ? "Ativa" : "Inativa" },
                          { label: "Valor por km", value: formatCurrency(company.deliveryPricePerKm) },
                          { label: "Frete mínimo", value: formatCurrency(company.deliveryMinimumFee) },
                          { label: "Multiplicador ida/volta", value: String(company.deliveryRoundTripMultiplier || 0) },
                          { label: "Distância máxima", value: `${company.deliveryMaxDistanceKm || 0} km` },
                        ]}
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>
                            Endereço: <strong className="text-slate-900">{buildAddress(company) || "—"}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-400" />
                          <span>
                            Página pública:{" "}
                            <strong className="text-slate-900">
                              {publicUrl || "—"}
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-slate-400" />
                          <span>
                            Última atividade operacional:{" "}
                            <strong className="text-slate-900">
                              {formatDateTime(company.lastOrderAt)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {company.publicDescription ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Descrição pública
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {company.publicDescription}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-[22px] border border-blue-200 bg-blue-50 p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                        <FieldBlock label="Plano">
                          <select
                            value={draft.plan}
                            onChange={(e) =>
                              updateCompanyDraft(company.id, { plan: e.target.value })
                            }
                            className="h-11 w-full rounded-2xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          >
                            <option value="free">free</option>
                            <option value="start">start</option>
                            <option value="pro">pro</option>
                            <option value="enterprise">enterprise</option>
                          </select>
                        </FieldBlock>

                        <FieldBlock label="Status do plano">
                          <select
                            value={draft.planStatus}
                            onChange={(e) =>
                              updateCompanyDraft(company.id, { planStatus: e.target.value })
                            }
                            className="h-11 w-full rounded-2xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          >
                            <option value="trial">trial</option>
                            <option value="active">active</option>
                            <option value="blocked">blocked</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </FieldBlock>

                        <FieldBlock label="Limite de usuários">
                          <input
                            type="number"
                            min={1}
                            value={draft.maxUsers}
                            onChange={(e) =>
                              updateCompanyDraft(company.id, {
                                maxUsers: Number(e.target.value || 1),
                              })
                            }
                            className="h-11 w-full rounded-2xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          />
                        </FieldBlock>

                        <FieldBlock label="Empresa ativa">
                          <select
                            value={draft.active ? "true" : "false"}
                            onChange={(e) =>
                              updateCompanyDraft(company.id, {
                                active: e.target.value === "true",
                              })
                            }
                            className="h-11 w-full rounded-2xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                          >
                            <option value="true">ativa</option>
                            <option value="false">inativa</option>
                          </select>
                        </FieldBlock>

                        <div className="flex w-full gap-3 xl:w-auto">
                          <button
                            type="button"
                            onClick={() => handleSaveCompany(company)}
                            disabled={savingCompanyId === company.id}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingCompanyId === company.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Salvar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(company)}
                            disabled={deletingCompanyId === company.id}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingCompanyId === company.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

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

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full xl:min-w-[180px]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function InfoPanel({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-start justify-between gap-4">
            <span className="text-sm text-slate-500">{row.label}</span>
            <span className="max-w-[60%] text-right text-sm font-medium text-slate-900">
              {row.value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
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