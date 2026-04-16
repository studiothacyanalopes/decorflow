"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  Truck,
  User2,
  Users,
  Wallet,
  Package,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompanyContext = {
  id: string;
  name: string;
};

type DeliveryAddress = {
  zip_code?: string;
  address_line?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  product_snapshot?: {
    image_url?: string | null;
  } | null;
};

type OrderCost = {
  id: string;
  order_id: string;
  description: string;
  amount: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
};

type Order = {
  id: string;
  company_id: string;
  order_number: string;
  source: string;
  client_name: string;
  client_phone: string;
  event_date: string | null;
  receive_mode: "pickup" | "delivery";
  delivery_address_json: DeliveryAddress | null;
  delivery_fee: number;
  distance_km: number | null;
  duration_minutes: number | null;
  products_subtotal: number;
  extra_cost_total: number;
  total_amount: number;
  order_status: string;
  delivery_status: string;
  contract_status: string;
  contract_model_name: string | null;
  contract_link: string | null;
  signed_contract_file_url: string | null;
  signed_on_gov: boolean;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  whatsapp_message: string | null;
  whatsapp_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  decor_order_items?: OrderItem[];
  decor_order_costs?: OrderCost[];
};

type ClientSummary = {
  id: string;
  client_name: string;
  client_phone: string;
  total_orders: number;
  total_spent: number;
  total_extra_costs: number;
  estimated_profit: number;
  total_delivery_orders: number;
  total_pickup_orders: number;
  last_order_date: string | null;
  first_order_date: string | null;
  average_ticket: number;
  most_recent_address: DeliveryAddress | null;
  all_orders: Order[];
  favorite_items: { name: string; count: number; revenue: number }[];
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  if (value.includes("T")) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(value));
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function normalizePhone(phone?: string | null) {
  return String(phone || "").replace(/\D/g, "");
}

function formatPhone(phone?: string | null) {
  const digits = normalizePhone(phone);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone || "—";
}

function buildWhatsAppUrl(phone?: string | null, text?: string) {
  const clean = normalizePhone(phone);
  if (!clean) return "#";
  const full = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text || "Olá!")}`;
}

function buildAddressText(address?: DeliveryAddress | null) {
  if (!address) return "—";

  return [
    address.address_line,
    address.address_number,
    address.neighborhood,
    address.city,
    address.state,
    address.zip_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function getClientId(order: Order) {
  const normalizedPhone = normalizePhone(order.client_phone);
  if (normalizedPhone) return normalizedPhone;
  return `${order.client_name || "cliente-sem-telefone"}-${order.id}`;
}

export default function DecorClientesPage() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "delivery" | "pickup">("all");
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setStatus({
          type: "error",
          message: "Não foi possível identificar o usuário logado.",
        });
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id, companies:company_id(id, name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership?.company_id) {
        setStatus({
          type: "error",
          message: "Nenhuma empresa encontrada para este usuário.",
        });
        return;
      }

      const companyData = Array.isArray(membership.companies)
        ? membership.companies[0]
        : membership.companies;

      setCompany({
        id: membership.company_id,
        name: companyData?.name || "Minha empresa",
      });

      const { data, error } = await supabase
        .from("decor_orders")
        .select(`
          *,
          decor_order_items (*),
          decor_order_costs (*)
        `)
        .eq("company_id", membership.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os clientes.",
        });
        return;
      }

      setOrders((data || []) as Order[]);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar os clientes.",
      });
    } finally {
      setLoading(false);
    }
  }

  const clients = useMemo<ClientSummary[]>(() => {
    const groups = new Map<string, Order[]>();

    for (const order of orders) {
      const key = getClientId(order);
      const existing = groups.get(key) || [];
      existing.push(order);
      groups.set(key, existing);
    }

    const result: ClientSummary[] = Array.from(groups.entries()).map(([key, clientOrders]) => {
      const sortedOrders = [...clientOrders].sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });

      const latestOrder = sortedOrders[0];
      const oldestOrder = [...sortedOrders].reverse()[0];

      const totalSpent = sortedOrders.reduce(
        (acc, order) => acc + Number(order.total_amount || 0),
        0
      );

      const totalExtraCosts = sortedOrders.reduce(
        (acc, order) =>
          acc +
          (order.decor_order_costs || []).reduce(
            (sum, cost) => sum + Number(cost.amount || 0),
            0
          ),
        0
      );

      const estimatedProfit = totalSpent - totalExtraCosts;

      const totalDeliveryOrders = sortedOrders.filter(
        (order) => order.receive_mode === "delivery"
      ).length;

      const totalPickupOrders = sortedOrders.filter(
        (order) => order.receive_mode === "pickup"
      ).length;

      const favoriteItemsMap = new Map<string, { count: number; revenue: number }>();

      for (const order of sortedOrders) {
        for (const item of order.decor_order_items || []) {
          const current = favoriteItemsMap.get(item.product_name) || {
            count: 0,
            revenue: 0,
          };

          favoriteItemsMap.set(item.product_name, {
            count: current.count + Number(item.quantity || 0),
            revenue: current.revenue + Number(item.total_price || 0),
          });
        }
      }

      const favoriteItems = Array.from(favoriteItemsMap.entries())
        .map(([name, data]) => ({
          name,
          count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return {
        id: key,
        client_name: latestOrder.client_name || "Cliente sem nome",
        client_phone: latestOrder.client_phone || "",
        total_orders: sortedOrders.length,
        total_spent: totalSpent,
        total_extra_costs: totalExtraCosts,
        estimated_profit: estimatedProfit,
        total_delivery_orders: totalDeliveryOrders,
        total_pickup_orders: totalPickupOrders,
        last_order_date: latestOrder.event_date || latestOrder.created_at,
        first_order_date: oldestOrder.event_date || oldestOrder.created_at,
        average_ticket: sortedOrders.length > 0 ? totalSpent / sortedOrders.length : 0,
        most_recent_address:
          sortedOrders.find((order) => order.delivery_address_json)?.delivery_address_json || null,
        all_orders: sortedOrders,
        favorite_items: favoriteItems,
      };
    });

    return result.sort((a, b) => {
      const aDate = a.all_orders[0]?.created_at ? new Date(a.all_orders[0].created_at).getTime() : 0;
      const bDate = b.all_orders[0]?.created_at ? new Date(b.all_orders[0].created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [orders]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !term ||
        [
          client.client_name,
          client.client_phone,
          ...client.favorite_items.map((item) => item.name),
          ...client.all_orders.map((order) => order.order_number),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesMode =
        filterMode === "all" ||
        (filterMode === "delivery" && client.total_delivery_orders > 0) ||
        (filterMode === "pickup" && client.total_pickup_orders > 0);

      return matchesSearch && matchesMode;
    });
  }, [clients, search, filterMode]);

  useEffect(() => {
    if (!filteredClients.length) {
      setSelectedClient(null);
      return;
    }

    setSelectedClient((prev) => {
      if (!prev) return filteredClients[0];
      return filteredClients.find((item) => item.id === prev.id) || filteredClients[0];
    });
  }, [filteredClients]);

  const metrics = useMemo(() => {
    const totalClients = clients.length;
    const totalOrders = clients.reduce((acc, client) => acc + client.total_orders, 0);
    const totalRevenue = clients.reduce((acc, client) => acc + client.total_spent, 0);
    const totalDeliveryClients = clients.filter((client) => client.total_delivery_orders > 0).length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalClients,
      totalOrders,
      totalRevenue,
      totalDeliveryClients,
      averageTicket,
    };
  }, [clients]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Clock3 className="h-4 w-4 animate-spin" />
          Carregando clientes...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1720px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#ffffff_40%,#ffffff_100%)] px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  <Users className="h-3.5 w-3.5" />
                  DecorFlow
                </div>

                <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Clientes
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Painel de clientes com visão mais gerencial, histórico em tabela e leitura mais forte do relacionamento.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Empresa
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {company?.name || "Minha empresa"}
                </p>
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

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={<Users className="h-5 w-5" />}
                label="Total de clientes"
                value={String(metrics.totalClients)}
                tone="slate"
              />
              <MetricCard
                icon={<ShoppingBag className="h-5 w-5" />}
                label="Pedidos gerados"
                value={String(metrics.totalOrders)}
                tone="blue"
              />
              <MetricCard
                icon={<Wallet className="h-5 w-5" />}
                label="Valor movimentado"
                value={formatCurrency(metrics.totalRevenue)}
                tone="emerald"
              />
              <MetricCard
                icon={<Truck className="h-5 w-5" />}
                label="Clientes com entrega"
                value={String(metrics.totalDeliveryClients)}
                tone="amber"
              />
              <MetricCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Ticket médio"
                value={formatCurrency(metrics.averageTicket)}
                tone="rose"
              />
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50/60 xl:border-b-0 xl:border-r">
              <div className="border-b border-slate-200 bg-white/70 p-4 sm:p-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente, telefone, item ou pedido"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </div>

                <div className="mt-3">
                  <Select
                    value={filterMode}
                    onChange={(value) => setFilterMode(value as typeof filterMode)}
                    options={[
                      { value: "all", label: "Entrega e retirada" },
                      { value: "delivery", label: "Somente clientes com entrega" },
                      { value: "pickup", label: "Somente clientes com retirada" },
                    ]}
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-3 sm:p-4">
                {filteredClients.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      Nenhum cliente encontrado
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Assim que os pedidos entrarem, os clientes serão agrupados aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClients.map((client) => {
                      const active = selectedClient?.id === client.id;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedClient(client)}
                          className={`group w-full rounded-[24px] border p-4 text-left transition ${
                            active
                              ? "border-blue-300 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] shadow-[0_18px_40px_rgba(59,130,246,0.12)]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-slate-950">
                                {client.client_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatPhone(client.client_phone)}
                              </p>
                            </div>

                            <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {client.total_orders}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <MiniStat label="Total" value={formatCurrency(client.total_spent)} />
                            <MiniStat label="Ticket" value={formatCurrency(client.average_ticket)} />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {client.total_delivery_orders > 0 ? (
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                {client.total_delivery_orders} entrega(s)
                              </span>
                            ) : null}

                            {client.total_pickup_orders > 0 ? (
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                {client.total_pickup_orders} retirada(s)
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
              {!selectedClient ? (
                <div className="flex min-h-[560px] items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Selecione um cliente
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Clique em um card para abrir a visão detalhada do cliente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Cliente
                          </p>
                          <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
                            {selectedClient.client_name}
                          </h2>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={buildWhatsAppUrl(
                                selectedClient.client_phone,
                                `Olá, ${selectedClient.client_name}! Estou entrando em contato sobre seu pedido na ${company?.name || "empresa"}.`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Chamar no WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <HeroInfoCard
                          icon={<Phone className="h-4 w-4" />}
                          label="Telefone"
                          value={formatPhone(selectedClient.client_phone)}
                        />
                        <HeroInfoCard
                          icon={<ShoppingBag className="h-4 w-4" />}
                          label="Pedidos"
                          value={String(selectedClient.total_orders)}
                        />
                        <HeroInfoCard
                          icon={<Wallet className="h-4 w-4" />}
                          label="Total gasto"
                          value={formatCurrency(selectedClient.total_spent)}
                        />
                        <HeroInfoCard
                          icon={<CalendarDays className="h-4 w-4" />}
                          label="Último pedido"
                          value={formatDate(
                            selectedClient.all_orders[0]?.event_date ||
                              selectedClient.all_orders[0]?.created_at
                          )}
                        />
                      </div>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-5">
                          <PanelCard
                            title="Resumo operacional"
                            subtitle="Visão consolidada do relacionamento com este cliente."
                            icon={<User2 className="h-5 w-5 text-slate-700" />}
                          >
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <SmallInfo
                                label="Ticket médio"
                                value={formatCurrency(selectedClient.average_ticket)}
                              />
                              <SmallInfo
                                label="Custos extras"
                                value={formatCurrency(selectedClient.total_extra_costs)}
                              />
                              <SmallInfo
                                label="Estimativa líquida"
                                value={formatCurrency(selectedClient.estimated_profit)}
                              />
                              <SmallInfo
                                label="Primeiro pedido"
                                value={formatDate(selectedClient.first_order_date)}
                              />
                            </div>
                          </PanelCard>

                          <PanelCard
                            title="Histórico de pedidos"
                            subtitle="Visual em tabela para leitura rápida e mais profissional."
                            icon={<BarChart3 className="h-5 w-5 text-slate-700" />}
                          >
                            <div className="overflow-hidden rounded-[24px] border border-slate-200">
                              <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                  <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200">
                                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Pedido
                                      </th>
                                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Evento
                                      </th>
                                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Recebimento
                                      </th>
                                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Itens
                                      </th>
                                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Total
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {selectedClient.all_orders.map((order) => {
                                      const itemsCount = (order.decor_order_items || []).reduce(
                                        (acc, item) => acc + Number(item.quantity || 0),
                                        0
                                      );

                                      return (
                                        <tr
                                          key={order.id}
                                          className="border-b border-slate-200 last:border-b-0"
                                        >
                                          <td className="px-4 py-4 align-top">
                                            <div>
                                              <p className="text-sm font-semibold text-slate-900">
                                                {order.order_number}
                                              </p>
                                              <p className="mt-1 text-xs text-slate-500">
                                                {formatDateTime(order.created_at)}
                                              </p>
                                            </div>
                                          </td>

                                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                                            {formatDate(order.event_date)}
                                          </td>

                                          <td className="px-4 py-4 align-top">
                                            <span
                                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                order.receive_mode === "delivery"
                                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                  : "border border-blue-200 bg-blue-50 text-blue-700"
                                              }`}
                                            >
                                              {order.receive_mode === "delivery"
                                                ? "Entrega"
                                                : "Retirada"}
                                            </span>
                                          </td>

                                          <td className="px-4 py-4 align-top text-sm text-slate-700">
                                            {itemsCount}
                                          </td>

                                          <td className="px-4 py-4 align-top text-right text-sm font-semibold text-slate-900">
                                            {formatCurrency(order.total_amount)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </PanelCard>

                          <PanelCard
                            title="Itens mais pedidos"
                            subtitle="Tabela com os produtos mais recorrentes deste cliente."
                            icon={<Package className="h-5 w-5 text-slate-700" />}
                          >
                            {selectedClient.favorite_items.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                Ainda não há itens suficientes para análise.
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full border-collapse">
                                    <thead className="bg-slate-50">
                                      <tr className="border-b border-slate-200">
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                          Item
                                        </th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                          Quantidade
                                        </th>
                                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                          Valor gerado
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {selectedClient.favorite_items.map((item) => (
                                        <tr
                                          key={item.name}
                                          className="border-b border-slate-200 last:border-b-0"
                                        >
                                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                                            {item.name}
                                          </td>
                                          <td className="px-4 py-4 text-sm text-slate-700">
                                            {item.count}
                                          </td>
                                          <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                                            {formatCurrency(item.revenue)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </PanelCard>
                        </div>

                        <div className="space-y-5">
                          <PanelCard
                            title="Comportamento do cliente"
                            subtitle="Entrega, retirada e última movimentação."
                            icon={<Truck className="h-5 w-5 text-slate-700" />}
                          >
                            <div className="space-y-3">
                              <SummaryLine
                                label="Pedidos com entrega"
                                value={String(selectedClient.total_delivery_orders)}
                              />
                              <SummaryLine
                                label="Pedidos com retirada"
                                value={String(selectedClient.total_pickup_orders)}
                              />
                              <SummaryLine
                                label="Última atividade"
                                value={formatDateTime(
                                  selectedClient.all_orders[0]?.created_at
                                )}
                              />
                            </div>
                          </PanelCard>

                          <PanelCard
                            title="Endereço mais recente"
                            subtitle="Último endereço registrado para entrega."
                            icon={<MapPin className="h-5 w-5 text-slate-700" />}
                          >
                            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm leading-7 text-slate-600">
                                {buildAddressText(selectedClient.most_recent_address)}
                              </p>

                              {selectedClient.most_recent_address?.reference ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                  <span className="font-semibold text-slate-900">
                                    Referência:
                                  </span>{" "}
                                  {selectedClient.most_recent_address.reference}
                                </div>
                              ) : null}
                            </div>
                          </PanelCard>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "slate" | "blue" | "emerald" | "amber" | "rose";
}) {
  const toneMap = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneMap[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function HeroInfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">{icon}</div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}