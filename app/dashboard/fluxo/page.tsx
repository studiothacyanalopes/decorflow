"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  GripVertical,
  Loader2,
  MoveRight,
  Package2,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompanyContext = {
  id: string;
  name: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
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
  delivery_fee: number;
  products_subtotal: number;
  extra_cost_total: number;
  total_amount: number;
  order_status:
    | "new"
    | "awaiting_confirmation"
    | "confirmed"
    | "in_production"
    | "ready"
    | "completed"
    | "cancelled";
  delivery_status: string;
  contract_status: string;
  created_at: string;
  updated_at: string;
  decor_order_items?: OrderItem[];
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

const ORDER_STATUS_OPTIONS: {
  value: Order["order_status"];
  label: string;
  shortLabel: string;
  tone: "slate" | "blue" | "emerald" | "amber" | "violet" | "rose";
  accent: string;
  soft: string;
}[] = [
  {
    value: "new",
    label: "Novo",
    shortLabel: "Novo",
    tone: "slate",
    accent: "border-slate-300",
    soft: "bg-slate-50",
  },
  {
    value: "awaiting_confirmation",
    label: "Aguardando confirmação",
    shortLabel: "Aguardando",
    tone: "blue",
    accent: "border-blue-300",
    soft: "bg-blue-50/70",
  },
  {
    value: "confirmed",
    label: "Confirmado",
    shortLabel: "Confirmado",
    tone: "emerald",
    accent: "border-emerald-300",
    soft: "bg-emerald-50/70",
  },
  {
    value: "in_production",
    label: "Em produção",
    shortLabel: "Produção",
    tone: "amber",
    accent: "border-amber-300",
    soft: "bg-amber-50/70",
  },
  {
    value: "ready",
    label: "Pronto",
    shortLabel: "Pronto",
    tone: "violet",
    accent: "border-violet-300",
    soft: "bg-violet-50/70",
  },
  {
    value: "completed",
    label: "Concluído",
    shortLabel: "Concluído",
    tone: "emerald",
    accent: "border-emerald-400",
    soft: "bg-emerald-100/70",
  },
  {
    value: "cancelled",
    label: "Cancelado",
    shortLabel: "Cancelado",
    tone: "rose",
    accent: "border-rose-300",
    soft: "bg-rose-50/70",
  },
];

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusToneClass(
  tone: "slate" | "blue" | "emerald" | "amber" | "violet" | "rose"
) {
  const map = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return map[tone];
}

export default function DecorFluxoPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [receiveModeFilter, setReceiveModeFilter] = useState<
    "all" | "pickup" | "delivery"
  >("all");
  const [status, setStatus] = useState<StatusState>({
    type: "",
    message: "",
  });

  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Order["order_status"] | null>(
    null
  );

  useEffect(() => {
    loadFlow();
  }, []);

  async function loadFlow() {
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
          decor_order_items (*)
        `)
        .eq("company_id", membership.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar o fluxo dos pedidos.",
        });
        return;
      }

      setOrders((data || []) as Order[]);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar o fluxo.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function persistOrderStatus(
    orderId: string,
    nextStatus: Order["order_status"]
  ) {
    setSavingId(orderId);

    const { error } = await supabase
      .from("decor_orders")
      .update({
        order_status: nextStatus,
      })
      .eq("id", orderId);

    setSavingId(null);

    if (error) {
      setStatus({
        type: "error",
        message: "Não foi possível atualizar o status do pedido.",
      });
      return false;
    }

    setStatus({
      type: "success",
      message: "Etapa do pedido atualizada com sucesso.",
    });

    return true;
  }

  async function moveOrderToStatus(
    orderId: string,
    nextStatus: Order["order_status"]
  ) {
    const currentOrder = orders.find((item) => item.id === orderId);
    if (!currentOrder || currentOrder.order_status === nextStatus) return;

    const previousOrders = orders;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, order_status: nextStatus } : order
      )
    );

    const ok = await persistOrderStatus(orderId, nextStatus);

    if (!ok) {
      setOrders(previousOrders);
    }
  }

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        [
          order.order_number,
          order.client_name,
          order.client_phone,
          ...(order.decor_order_items || []).map((item) => item.product_name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesReceive =
        receiveModeFilter === "all" || order.receive_mode === receiveModeFilter;

      return matchesSearch && matchesReceive;
    });
  }, [orders, search, receiveModeFilter]);

  const groupedOrders = useMemo(() => {
    return ORDER_STATUS_OPTIONS.map((column) => {
      const items = filteredOrders.filter(
        (order) => order.order_status === column.value
      );

      const totalAmount = items.reduce(
        (acc, item) => acc + Number(item.total_amount || 0),
        0
      );

      return {
        ...column,
        items,
        totalAmount,
      };
    });
  }, [filteredOrders]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce(
      (acc, item) => acc + Number(item.total_amount || 0),
      0
    );
    const inProduction = filteredOrders.filter(
      (item) => item.order_status === "in_production"
    ).length;
    const readyOrders = filteredOrders.filter(
      (item) => item.order_status === "ready"
    ).length;
    const completedOrders = filteredOrders.filter(
      (item) => item.order_status === "completed"
    ).length;
    const deliveryOrders = filteredOrders.filter(
      (item) => item.receive_mode === "delivery"
    ).length;

    return {
      totalOrders,
      totalAmount,
      inProduction,
      readyOrders,
      completedOrders,
      deliveryOrders,
    };
  }, [filteredOrders]);

  function handleDragStart(orderId: string) {
    setDraggedOrderId(orderId);
  }

  function handleDragEnd() {
    setDraggedOrderId(null);
    setDragOverColumn(null);
  }

  async function handleDropColumn(targetStatus: Order["order_status"]) {
    if (!draggedOrderId) return;
    await moveOrderToStatus(draggedOrderId, targetStatus);
    setDraggedOrderId(null);
    setDragOverColumn(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fluxo...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1880px] px-3 py-3 sm:px-5 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  DecorFlow
                </div>
                <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Fluxo
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                  Pipeline operacional dos pedidos em estilo kanban, com arrastar e soltar no desktop e movimentação rápida no mobile.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Empresa</p>
                <p>{company?.name || "Minha empresa"}</p>
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

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Total de pedidos"
                value={String(metrics.totalOrders)}
                tone="slate"
              />
              <MetricCard
                icon={<Wallet className="h-5 w-5" />}
                label="Valor no fluxo"
                value={formatCurrency(metrics.totalAmount)}
                tone="blue"
              />
              <MetricCard
                icon={<Package2 className="h-5 w-5" />}
                label="Em produção"
                value={String(metrics.inProduction)}
                tone="amber"
              />
              <MetricCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Prontos"
                value={String(metrics.readyOrders)}
                tone="violet"
              />
              <MetricCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Concluídos"
                value={String(metrics.completedOrders)}
                tone="emerald"
              />
              <MetricCard
                icon={<Truck className="h-5 w-5" />}
                label="Com entrega"
                value={String(metrics.deliveryOrders)}
                tone="rose"
              />
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[1.2fr_0.35fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pedido, cliente, telefone ou item"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
              </div>

              <Select
                value={receiveModeFilter}
                onChange={(value) =>
                  setReceiveModeFilter(value as typeof receiveModeFilter)
                }
                options={[
                  { value: "all", label: "Entrega e retirada" },
                  { value: "delivery", label: "Somente entrega" },
                  { value: "pickup", label: "Somente retirada" },
                ]}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-[1720px] gap-4 p-4 sm:p-5 lg:p-6">
              {groupedOrders.map((column) => {
                const isActiveDrop = dragOverColumn === column.value;

                return (
                  <div
                    key={column.value}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColumn(column.value);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropColumn(column.value);
                    }}
                    onDragLeave={() => {
                      if (dragOverColumn === column.value) {
                        setDragOverColumn(null);
                      }
                    }}
                    className={`flex w-[350px] shrink-0 flex-col rounded-[26px] border bg-slate-50 transition ${
                      isActiveDrop
                        ? `border-blue-300 ring-2 ring-blue-100 ${column.soft}`
                        : `border-slate-200 ${column.soft}`
                    }`}
                  >
                    <div className="border-b border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusToneClass(
                              column.tone
                            )}`}
                          >
                            {column.label}
                          </div>

                          <p className="mt-3 text-sm font-semibold text-slate-900">
                            {column.items.length} pedido(s)
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatCurrency(column.totalAmount)}
                          </p>
                        </div>

                        {isActiveDrop ? (
                          <div className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            Solte aqui
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="max-h-[calc(100vh-300px)] space-y-3 overflow-y-auto p-4">
                      {column.items.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/80 p-5 text-center text-sm text-slate-500">
                          Nenhum pedido nesta etapa.
                        </div>
                      ) : (
                        column.items.map((order) => {
                          const itemsCount = (order.decor_order_items || []).reduce(
                            (acc, item) => acc + Number(item.quantity || 0),
                            0
                          );

                          return (
                            <div
                              key={order.id}
                              draggable
                              onDragStart={() => handleDragStart(order.id)}
                              onDragEnd={handleDragEnd}
                              className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${
                                draggedOrderId === order.id
                                  ? "opacity-60 ring-2 ring-blue-100"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-slate-300" />
                                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {order.order_number}
                                    </p>
                                  </div>

                                  <h3 className="mt-2 truncate text-[15px] font-semibold text-slate-900">
                                    {order.client_name}
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Evento em {formatDate(order.event_date || order.created_at)}
                                  </p>
                                </div>

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                    order.receive_mode === "delivery"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-blue-200 bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {order.receive_mode === "delivery"
                                    ? "Entrega"
                                    : "Retirada"}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <MiniInfo
                                  label="Itens"
                                  value={String(itemsCount)}
                                />
                                <MiniInfo
                                  label="Subtotal"
                                  value={formatCurrency(order.products_subtotal)}
                                />
                                <MiniInfo
                                  label="Total"
                                  value={formatCurrency(order.total_amount)}
                                />
                              </div>

                              <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  Mover etapa
                                </p>

                                <div className="mt-3 hidden md:block">
                                  <div className="relative">
                                    <select
                                      value={order.order_status}
                                      onChange={(e) =>
                                        moveOrderToStatus(
                                          order.id,
                                          e.target.value as Order["order_status"]
                                        )
                                      }
                                      disabled={savingId === order.id}
                                      className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {ORDER_STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>

                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 md:hidden">
                                  {ORDER_STATUS_OPTIONS.filter(
                                    (option) => option.value !== order.order_status
                                  )
                                    .slice(0, 3)
                                    .map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                          moveOrderToStatus(order.id, option.value)
                                        }
                                        disabled={savingId === order.id}
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${statusToneClass(
                                          option.tone
                                        )}`}
                                      >
                                        <MoveRight className="h-3 w-3" />
                                        {option.shortLabel}
                                      </button>
                                    ))}
                                </div>

                                {savingId === order.id ? (
                                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Salvando...
                                  </div>
                                ) : (
                                  <p className="mt-2 text-[11px] text-slate-400">
                                    Desktop: arraste entre colunas. Mobile: use os botões rápidos.
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>Criado em</span>
                                <span>{formatDateTime(order.created_at)}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
  tone: "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";
}) {
  const toneMap = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
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

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}