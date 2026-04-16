"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
  Landmark,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Tags,
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
  client_name: string;
  client_phone: string;
  event_date: string | null;
  receive_mode: "pickup" | "delivery";
  delivery_fee: number;
  products_subtotal: number;
  total_amount: number;
  extra_cost_total: number;
  order_status: string;
  delivery_status: string;
  contract_status: string;
  created_at: string;
  updated_at: string;
  decor_order_items?: OrderItem[];
  decor_order_costs?: OrderCost[];
};

type ManualExpense = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  category: string;
  payment_method: string;
  type: "expense" | "income";
  status: "pending" | "paid" | "cancelled";
  amount: number;
  expense_date: string;
  due_date: string | null;
  paid_at: string | null;
  supplier: string | null;
  order_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

type CashflowRow = {
  id: string;
  date: string;
  kind: "income" | "expense";
  status: "received" | "pending" | "cancelled";
  title: string;
  description: string;
  category: string;
  payment_method: string;
  amount: number;
  source: "order" | "order_cost" | "manual_expense";
  related_order_number?: string;
};

const EXPENSE_CATEGORIES = [
  "geral",
  "compra de material",
  "fornecedor",
  "frete",
  "combustível",
  "marketing",
  "impostos",
  "embalagem",
  "manutenção",
  "outros",
];

const PAYMENT_METHODS = [
  "pix",
  "dinheiro",
  "cartão",
  "boleto",
  "transferência",
  "débito",
  "outro",
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

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayDate() {
  return toDateInputValue(new Date());
}

function getStartOfMonth() {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function isFutureDate(date?: string | null) {
  if (!date) return false;
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

function isCancelledOrder(order: Order) {
  return ["cancelled"].includes(order.order_status);
}

function isCompletedOrder(order: Order) {
  return ["completed"].includes(order.order_status);
}

function isActivePendingOrder(order: Order) {
  return !isCancelledOrder(order) && !isCompletedOrder(order);
}

export default function DecorFinanceiroPage() {
  const [loading, setLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "month" | "future">("month");
  const [kindFilter, setKindFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "pending" | "cancelled">("all");

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    description: "",
    category: "geral",
    payment_method: "pix",
    type: "expense" as "expense" | "income",
    status: "pending" as "pending" | "paid" | "cancelled",
    amount: "",
    expense_date: getTodayDate(),
    due_date: "",
    supplier: "",
    notes: "",
  });

  useEffect(() => {
    loadFinance();
  }, []);

  async function loadFinance() {
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

      const companyId = membership.company_id;

      setCompany({
        id: companyId,
        name: companyData?.name || "Minha empresa",
      });

      const [ordersRes, expensesRes] = await Promise.all([
        supabase
          .from("decor_orders")
          .select(`
            *,
            decor_order_items (*),
            decor_order_costs (*)
          `)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),

        supabase
          .from("decor_financial_expenses")
          .select("*")
          .eq("company_id", companyId)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (ordersRes.error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os pedidos do financeiro.",
        });
        return;
      }

      if (expensesRes.error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar as despesas manuais. Verifique se a tabela decor_financial_expenses foi criada.",
        });
        setOrders((ordersRes.data || []) as Order[]);
        setManualExpenses([]);
        return;
      }

      setOrders((ordersRes.data || []) as Order[]);
      setManualExpenses((expensesRes.data || []) as ManualExpense[]);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar o financeiro.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!company?.id) return;

    if (!expenseForm.title.trim()) {
      setStatus({
        type: "error",
        message: "Informe o título da movimentação.",
      });
      return;
    }

    const amount = Number(expenseForm.amount || 0);

    if (amount <= 0) {
      setStatus({
        type: "error",
        message: "Informe um valor válido.",
      });
      return;
    }

    try {
      setSavingExpense(true);
      setStatus({ type: "", message: "" });

      const payload = {
        company_id: company.id,
        title: expenseForm.title.trim(),
        description: expenseForm.description.trim() || null,
        category: expenseForm.category,
        payment_method: expenseForm.payment_method,
        type: expenseForm.type,
        status: expenseForm.status,
        amount,
        expense_date: expenseForm.expense_date || getTodayDate(),
        due_date: expenseForm.due_date || null,
        paid_at: expenseForm.status === "paid" ? new Date().toISOString() : null,
        supplier: expenseForm.supplier.trim() || null,
        notes: expenseForm.notes.trim() || null,
      };

      const { error } = await supabase
        .from("decor_financial_expenses")
        .insert(payload);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível cadastrar a movimentação manual.",
        });
        return;
      }

      setExpenseForm({
        title: "",
        description: "",
        category: "geral",
        payment_method: "pix",
        type: "expense",
        status: "pending",
        amount: "",
        expense_date: getTodayDate(),
        due_date: "",
        supplier: "",
        notes: "",
      });

      setStatus({
        type: "success",
        message: "Movimentação manual cadastrada com sucesso.",
      });

      await loadFinance();
    } finally {
      setSavingExpense(false);
    }
  }

  async function markExpenseAsPaid(expenseId: string) {
    const { error } = await supabase
      .from("decor_financial_expenses")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", expenseId);

    if (error) {
      setStatus({
        type: "error",
        message: "Não foi possível marcar a despesa como paga.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Despesa marcada como paga.",
    });

    await loadFinance();
  }

  const cashflowRows = useMemo<CashflowRow[]>(() => {
    const rows: CashflowRow[] = [];

    for (const order of orders) {
      rows.push({
        id: `order-${order.id}`,
        date: order.event_date || order.created_at,
        kind: "income",
        status: isCancelledOrder(order)
          ? "cancelled"
          : isCompletedOrder(order)
          ? "received"
          : "pending",
        title: `Pedido ${order.order_number}`,
        description: `${order.client_name} • ${order.receive_mode === "delivery" ? "Entrega" : "Retirada"}`,
        category: "venda",
        payment_method: "a confirmar",
        amount: Number(order.total_amount || 0),
        source: "order",
        related_order_number: order.order_number,
      });

      for (const cost of order.decor_order_costs || []) {
        rows.push({
          id: `order-cost-${cost.id}`,
          date: cost.created_at,
          kind: "expense",
          status: "received",
          title: cost.description,
          description: cost.supplier || order.order_number,
          category: "custo do pedido",
          payment_method: "não informado",
          amount: Number(cost.amount || 0),
          source: "order_cost",
          related_order_number: order.order_number,
        });
      }
    }

    for (const expense of manualExpenses) {
      rows.push({
        id: `manual-${expense.id}`,
        date: expense.expense_date || expense.created_at,
        kind: expense.type,
        status:
          expense.status === "paid"
            ? "received"
            : expense.status === "cancelled"
            ? "cancelled"
            : "pending",
        title: expense.title,
        description:
          expense.description ||
          expense.supplier ||
          (expense.order_id ? "Relacionado a pedido" : "Movimentação manual"),
        category: expense.category,
        payment_method: expense.payment_method,
        amount: Number(expense.amount || 0),
        source: "manual_expense",
      });
    }

    return rows.sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return bTime - aTime;
    });
  }, [orders, manualExpenses]);

  const filteredRows = useMemo(() => {
    return cashflowRows.filter((row) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        [
          row.title,
          row.description,
          row.category,
          row.payment_method,
          row.related_order_number || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesKind = kindFilter === "all" || row.kind === kindFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      let matchesPeriod = true;

      if (periodFilter === "today") {
        matchesPeriod = row.date ? formatDate(row.date) === formatDate(getTodayDate()) : false;
      }

      if (periodFilter === "month") {
        const monthStart = new Date(getStartOfMonth()).getTime();
        const rowTime = new Date(row.date).getTime();
        matchesPeriod = rowTime >= monthStart;
      }

      if (periodFilter === "future") {
        matchesPeriod = isFutureDate(row.date);
      }

      return matchesSearch && matchesKind && matchesStatus && matchesPeriod;
    });
  }, [cashflowRows, search, kindFilter, statusFilter, periodFilter]);

  const financeMetrics = useMemo(() => {
    const receivedIncome = cashflowRows
      .filter((row) => row.kind === "income" && row.status === "received")
      .reduce((acc, row) => acc + row.amount, 0);

    const pendingIncome = cashflowRows
      .filter((row) => row.kind === "income" && row.status === "pending")
      .reduce((acc, row) => acc + row.amount, 0);

    const paidExpenses = cashflowRows
      .filter((row) => row.kind === "expense" && row.status === "received")
      .reduce((acc, row) => acc + row.amount, 0);

    const pendingExpenses = cashflowRows
      .filter((row) => row.kind === "expense" && row.status === "pending")
      .reduce((acc, row) => acc + row.amount, 0);

    const futureRevenue = orders
      .filter((order) => !isCancelledOrder(order) && isFutureDate(order.event_date))
      .reduce((acc, order) => acc + Number(order.total_amount || 0), 0);

    const balance = receivedIncome - paidExpenses;

    return {
      receivedIncome,
      pendingIncome,
      paidExpenses,
      pendingExpenses,
      futureRevenue,
      balance,
    };
  }, [cashflowRows, orders]);

  const paymentMethodSummary = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of cashflowRows) {
      const current = map.get(row.payment_method) || 0;
      map.set(row.payment_method, current + row.amount);
    }

    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [cashflowRows]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of cashflowRows) {
      const current = map.get(row.category) || 0;
      map.set(row.category, current + row.amount);
    }

    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [cashflowRows]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando financeiro...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1780px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  DecorFlow
                </div>
                <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Financeiro
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                  Fluxo de caixa completo com entradas dos pedidos, saídas dos custos dos pedidos, despesas manuais, pendências e projeções futuras.
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
                icon={<ArrowUpCircle className="h-5 w-5" />}
                label="Entradas recebidas"
                value={formatCurrency(financeMetrics.receivedIncome)}
                tone="emerald"
              />
              <MetricCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Entradas pendentes"
                value={formatCurrency(financeMetrics.pendingIncome)}
                tone="blue"
              />
              <MetricCard
                icon={<ArrowDownCircle className="h-5 w-5" />}
                label="Saídas pagas"
                value={formatCurrency(financeMetrics.paidExpenses)}
                tone="rose"
              />
              <MetricCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Saídas pendentes"
                value={formatCurrency(financeMetrics.pendingExpenses)}
                tone="amber"
              />
              <MetricCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Receitas futuras"
                value={formatCurrency(financeMetrics.futureRevenue)}
                tone="blue"
              />
              <MetricCard
                icon={<Wallet className="h-5 w-5" />}
                label="Saldo atual"
                value={formatCurrency(financeMetrics.balance)}
                tone="slate"
              />
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="border-b border-slate-200 xl:border-b-0 xl:border-r">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-4">
                  <div className="relative lg:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar movimentação, pedido, categoria..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                    />
                  </div>

                  <Select
                    value={periodFilter}
                    onChange={(value) => setPeriodFilter(value as typeof periodFilter)}
                    options={[
                      { value: "all", label: "Todo período" },
                      { value: "today", label: "Hoje" },
                      { value: "month", label: "Este mês" },
                      { value: "future", label: "Futuras" },
                    ]}
                  />

                  <Select
                    value={kindFilter}
                    onChange={(value) => setKindFilter(value as typeof kindFilter)}
                    options={[
                      { value: "all", label: "Entradas e saídas" },
                      { value: "income", label: "Somente entradas" },
                      { value: "expense", label: "Somente saídas" },
                    ]}
                  />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-4">
                  <Select
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                    options={[
                      { value: "all", label: "Todos status" },
                      { value: "received", label: "Recebidos / pagos" },
                      { value: "pending", label: "Pendentes" },
                      { value: "cancelled", label: "Cancelados" },
                    ]}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Forma
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Nenhuma movimentação encontrada para os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatDate(row.date)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                row.kind === "income"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                              }`}
                            >
                              {row.kind === "income" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {row.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {row.description}
                                {row.related_order_number
                                  ? ` • ${row.related_order_number}`
                                  : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {row.category}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {row.payment_method}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                row.status === "received"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : row.status === "pending"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {row.status === "received"
                                ? "Recebido / Pago"
                                : row.status === "pending"
                                ? "Pendente"
                                : "Cancelado"}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-4 text-right text-sm font-semibold ${
                              row.kind === "income"
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {row.kind === "income" ? "+" : "-"}{" "}
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="p-4 sm:p-5">
              <div className="space-y-5">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Nova movimentação manual
                    </h3>
                  </div>

                  <form onSubmit={handleCreateExpense} className="mt-4 space-y-3">
                    <Input
                      label="Título"
                      value={expenseForm.title}
                      onChange={(value) =>
                        setExpenseForm((prev) => ({ ...prev, title: value }))
                      }
                      placeholder="Ex: Compra de TNT azul"
                    />

                    <Input
                      label="Descrição"
                      value={expenseForm.description}
                      onChange={(value) =>
                        setExpenseForm((prev) => ({ ...prev, description: value }))
                      }
                      placeholder="Descrição opcional"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectInput
                        label="Tipo"
                        value={expenseForm.type}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({
                            ...prev,
                            type: value as "expense" | "income",
                          }))
                        }
                        options={[
                          { value: "expense", label: "Saída / despesa" },
                          { value: "income", label: "Entrada manual" },
                        ]}
                      />

                      <SelectInput
                        label="Status"
                        value={expenseForm.status}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({
                            ...prev,
                            status: value as "pending" | "paid" | "cancelled",
                          }))
                        }
                        options={[
                          { value: "pending", label: "Pendente" },
                          { value: "paid", label: "Pago / recebido" },
                          { value: "cancelled", label: "Cancelado" },
                        ]}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectInput
                        label="Categoria"
                        value={expenseForm.category}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({ ...prev, category: value }))
                        }
                        options={EXPENSE_CATEGORIES.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                      />

                      <SelectInput
                        label="Forma de pagamento"
                        value={expenseForm.payment_method}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({
                            ...prev,
                            payment_method: value,
                          }))
                        }
                        options={PAYMENT_METHODS.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Valor"
                        value={expenseForm.amount}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({ ...prev, amount: value }))
                        }
                        placeholder="Ex: 120.00"
                      />

                      <Input
                        label="Fornecedor"
                        value={expenseForm.supplier}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({ ...prev, supplier: value }))
                        }
                        placeholder="Ex: Papelaria Central"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Data da movimentação"
                        value={expenseForm.expense_date}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({ ...prev, expense_date: value }))
                        }
                        type="date"
                      />

                      <Input
                        label="Vencimento"
                        value={expenseForm.due_date}
                        onChange={(value) =>
                          setExpenseForm((prev) => ({ ...prev, due_date: value }))
                        }
                        type="date"
                      />
                    </div>

                    <Input
                      label="Observações"
                      value={expenseForm.notes}
                      onChange={(value) =>
                        setExpenseForm((prev) => ({ ...prev, notes: value }))
                      }
                      placeholder="Ex: compra para montagem do evento"
                    />

                    <button
                      type="submit"
                      disabled={savingExpense}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingExpense ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Salvar movimentação
                    </button>
                  </form>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Resumo por forma
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {paymentMethodSummary.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhuma movimentação encontrada.
                      </p>
                    ) : (
                      paymentMethodSummary.map((item) => (
                        <InfoRow
                          key={item.name}
                          label={item.name}
                          value={formatCurrency(item.total)}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Tags className="h-5 w-5 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Resumo por categoria
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {categorySummary.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhuma categoria encontrada.
                      </p>
                    ) : (
                      categorySummary.map((item) => (
                        <InfoRow
                          key={item.name}
                          label={item.name}
                          value={formatCurrency(item.total)}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Despesas manuais pendentes
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {manualExpenses.filter((item) => item.status === "pending").length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhuma despesa pendente.
                      </p>
                    ) : (
                      manualExpenses
                        .filter((item) => item.status === "pending")
                        .slice(0, 6)
                        .map((expense) => (
                          <div
                            key={expense.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {expense.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {expense.category} • {formatDate(expense.expense_date)}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(expense.amount)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => markExpenseAsPaid(expense.id)}
                                  className="mt-2 inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Marcar como paga
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </aside>
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

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <Select value={value} onChange={onChange} options={options} />
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}