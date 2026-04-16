"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  Package2,
  Search,
  ShoppingBag,
  Tags,
  Truck,
  Users,
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
  source: string;
  client_name: string;
  client_phone: string;
  event_date: string | null;
  receive_mode: "pickup" | "delivery";
  delivery_fee: number;
  distance_km: number | null;
  duration_minutes: number | null;
  products_subtotal: number;
  extra_cost_total: number;
  total_amount: number;
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

type SalesRow = {
  id: string;
  order_number: string;
  client_name: string;
  event_date: string | null;
  created_at: string;
  receive_mode: string;
  items_count: number;
  products_subtotal: number;
  delivery_fee: number;
  extra_cost_total: number;
  total_amount: number;
  order_status: string;
};

type FinancialRow = {
  id: string;
  date: string;
  type: "entrada" | "saida";
  origin: string;
  title: string;
  category: string;
  payment_method: string;
  status: string;
  amount: number;
  related_order_number?: string;
};

type ProductPerformanceRow = {
  name: string;
  quantity: number;
  revenue: number;
  orders_count: number;
};

type CategoryPerformanceRow = {
  category: string;
  quantity: number;
  revenue: number;
};

type ClientPerformanceRow = {
  client_name: string;
  client_phone: string;
  total_orders: number;
  total_revenue: number;
  total_costs: number;
  estimated_profit: number;
  average_ticket: number;
  last_order_date: string | null;
};

type ReportTab =
  | "overview"
  | "sales"
  | "financial"
  | "products"
  | "clients";

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

function normalizePhone(phone?: string | null) {
  return String(phone || "").replace(/\D/g, "");
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth() {
  const now = new Date();
  return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function todayDate() {
  return toInputDate(new Date());
}

function buildCsv(headers: string[], rows: (string | number)[][]) {
  const escapeCell = (value: string | number) => {
    const stringValue = String(value ?? "");
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const content = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ].join("\n");

  return "\uFEFF" + content;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = buildCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    new: "Novo",
    awaiting_confirmation: "Aguardando confirmação",
    confirmed: "Confirmado",
    in_production: "Em produção",
    ready: "Pronto",
    completed: "Concluído",
    cancelled: "Cancelado",
    pending: "Pendente",
    paid: "Pago",
    received: "Recebido",
  };

  return map[status] || status;
}

export default function DecorRelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  const [tab, setTab] = useState<ReportTab>("overview");

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(todayDate());
  const [receiveModeFilter, setReceiveModeFilter] = useState<"all" | "pickup" | "delivery">("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | string>("all");
  const [financialTypeFilter, setFinancialTypeFilter] = useState<"all" | "entrada" | "saida">("all");

  const [salesPage, setSalesPage] = useState(1);
  const [financialPage, setFinancialPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);

  const PAGE_SIZE = 12;

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    setSalesPage(1);
    setFinancialPage(1);
    setProductsPage(1);
    setClientsPage(1);
  }, [search, dateFrom, dateTo, receiveModeFilter, orderStatusFilter, financialTypeFilter]);

  async function loadReports() {
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

      const [ordersRes, expensesRes] = await Promise.all([
        supabase
          .from("decor_orders")
          .select(`
            *,
            decor_order_items (*),
            decor_order_costs (*)
          `)
          .eq("company_id", membership.company_id)
          .order("created_at", { ascending: false }),

        supabase
          .from("decor_financial_expenses")
          .select("*")
          .eq("company_id", membership.company_id)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (ordersRes.error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os pedidos para os relatórios.",
        });
        return;
      }

      setOrders((ordersRes.data || []) as Order[]);

      if (expensesRes.error) {
        setManualExpenses([]);
        setStatus({
          type: "error",
          message:
            "Os relatórios financeiros manuais dependem da tabela decor_financial_expenses. A página continuará com os dados dos pedidos.",
        });
      } else {
        setManualExpenses((expensesRes.data || []) as ManualExpense[]);
      }
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar os relatórios.",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchText = [
        order.order_number,
        order.client_name,
        order.client_phone,
        order.order_status,
        ...(order.decor_order_items || []).map((item) => item.product_name),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search.trim() || searchText.includes(search.trim().toLowerCase());

      const orderDate = order.event_date || order.created_at?.slice(0, 10) || "";
      const matchesStart = !dateFrom || orderDate >= dateFrom;
      const matchesEnd = !dateTo || orderDate <= dateTo;

      const matchesReceive =
        receiveModeFilter === "all" || order.receive_mode === receiveModeFilter;

      const matchesStatus =
        orderStatusFilter === "all" || order.order_status === orderStatusFilter;

      return matchesSearch && matchesStart && matchesEnd && matchesReceive && matchesStatus;
    });
  }, [orders, search, dateFrom, dateTo, receiveModeFilter, orderStatusFilter]);

  const salesRows = useMemo<SalesRow[]>(() => {
    return filteredOrders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      client_name: order.client_name,
      event_date: order.event_date,
      created_at: order.created_at,
      receive_mode: order.receive_mode,
      items_count: (order.decor_order_items || []).reduce(
        (acc, item) => acc + Number(item.quantity || 0),
        0
      ),
      products_subtotal: Number(order.products_subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      extra_cost_total:
        (order.decor_order_costs || []).reduce(
          (acc, cost) => acc + Number(cost.amount || 0),
          0
        ) || Number(order.extra_cost_total || 0),
      total_amount: Number(order.total_amount || 0),
      order_status: order.order_status,
    }));
  }, [filteredOrders]);

  const financialRows = useMemo<FinancialRow[]>(() => {
    const rows: FinancialRow[] = [];

    for (const order of filteredOrders) {
      rows.push({
        id: `order-${order.id}`,
        date: order.event_date || order.created_at,
        type: "entrada",
        origin: "pedido",
        title: `Pedido ${order.order_number}`,
        category: "venda",
        payment_method: "a confirmar",
        status:
          order.order_status === "completed"
            ? "received"
            : order.order_status === "cancelled"
            ? "cancelled"
            : "pending",
        amount: Number(order.total_amount || 0),
        related_order_number: order.order_number,
      });

      for (const cost of order.decor_order_costs || []) {
        rows.push({
          id: `cost-${cost.id}`,
          date: cost.created_at,
          type: "saida",
          origin: "custo do pedido",
          title: cost.description,
          category: "custo do pedido",
          payment_method: "não informado",
          status: "received",
          amount: Number(cost.amount || 0),
          related_order_number: order.order_number,
        });
      }
    }

    for (const expense of manualExpenses) {
      const baseDate = expense.expense_date || expense.created_at?.slice(0, 10) || "";
      const matchesStart = !dateFrom || baseDate >= dateFrom;
      const matchesEnd = !dateTo || baseDate <= dateTo;

      const matchesSearch =
        !search.trim() ||
        [
          expense.title,
          expense.description || "",
          expense.category,
          expense.payment_method,
          expense.supplier || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase());

      if (!matchesStart || !matchesEnd || !matchesSearch) continue;

      rows.push({
        id: `manual-${expense.id}`,
        date: expense.expense_date || expense.created_at,
        type: expense.type === "income" ? "entrada" : "saida",
        origin: "manual",
        title: expense.title,
        category: expense.category,
        payment_method: expense.payment_method,
        status:
          expense.status === "paid"
            ? "received"
            : expense.status === "cancelled"
            ? "cancelled"
            : "pending",
        amount: Number(expense.amount || 0),
      });
    }

    return rows
      .filter((row) => {
        if (financialTypeFilter === "all") return true;
        return row.type === financialTypeFilter;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredOrders, manualExpenses, dateFrom, dateTo, search, financialTypeFilter]);

  const productRows = useMemo<ProductPerformanceRow[]>(() => {
    const map = new Map<
      string,
      { quantity: number; revenue: number; orderIds: Set<string> }
    >();

    for (const order of filteredOrders) {
      for (const item of order.decor_order_items || []) {
        const current = map.get(item.product_name) || {
          quantity: 0,
          revenue: 0,
          orderIds: new Set<string>(),
        };

        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.total_price || 0);
        current.orderIds.add(order.id);

        map.set(item.product_name, current);
      }
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
        orders_count: data.orderIds.size,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredOrders]);

  const categoryRows = useMemo<CategoryPerformanceRow[]>(() => {
    const map = new Map<string, { quantity: number; revenue: number }>();

    for (const order of filteredOrders) {
      for (const item of order.decor_order_items || []) {
        const categoryName = item.product_name || "Sem categoria";
        const current = map.get(categoryName) || { quantity: 0, revenue: 0 };
        current.quantity += Number(item.quantity || 0);
        current.revenue += Number(item.total_price || 0);
        map.set(categoryName, current);
      }
    }

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredOrders]);

  const clientRows = useMemo<ClientPerformanceRow[]>(() => {
    const map = new Map<
      string,
      {
        client_name: string;
        client_phone: string;
        total_orders: number;
        total_revenue: number;
        total_costs: number;
        last_order_date: string | null;
      }
    >();

    for (const order of filteredOrders) {
      const key = normalizePhone(order.client_phone) || `${order.client_name}-${order.id}`;
      const current = map.get(key) || {
        client_name: order.client_name || "Cliente",
        client_phone: order.client_phone || "",
        total_orders: 0,
        total_revenue: 0,
        total_costs: 0,
        last_order_date: null,
      };

      current.total_orders += 1;
      current.total_revenue += Number(order.total_amount || 0);
      current.total_costs += (order.decor_order_costs || []).reduce(
        (acc, cost) => acc + Number(cost.amount || 0),
        0
      );

      const candidateDate = order.event_date || order.created_at;
      if (
        !current.last_order_date ||
        new Date(candidateDate).getTime() > new Date(current.last_order_date).getTime()
      ) {
        current.last_order_date = candidateDate;
      }

      map.set(key, current);
    }

    return Array.from(map.values())
      .map((client) => ({
        client_name: client.client_name,
        client_phone: client.client_phone,
        total_orders: client.total_orders,
        total_revenue: client.total_revenue,
        total_costs: client.total_costs,
        estimated_profit: client.total_revenue - client.total_costs,
        average_ticket:
          client.total_orders > 0 ? client.total_revenue / client.total_orders : 0,
        last_order_date: client.last_order_date,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);
  }, [filteredOrders]);

  const overviewMetrics = useMemo(() => {
    const salesToday = salesRows
      .filter((row) => formatDate(row.event_date || row.created_at) === formatDate(todayDate()))
      .reduce((acc, row) => acc + row.total_amount, 0);

    const salesMonth = salesRows.reduce((acc, row) => acc + row.total_amount, 0);

    const totalExpenses = financialRows
      .filter((row) => row.type === "saida")
      .reduce((acc, row) => acc + row.amount, 0);

    const totalIncome = financialRows
      .filter((row) => row.type === "entrada")
      .reduce((acc, row) => acc + row.amount, 0);

    const pendingIncome = financialRows
      .filter((row) => row.type === "entrada" && row.status === "pending")
      .reduce((acc, row) => acc + row.amount, 0);

    const pendingExpenses = financialRows
      .filter((row) => row.type === "saida" && row.status === "pending")
      .reduce((acc, row) => acc + row.amount, 0);

    const topProduct = productRows[0];
    const topClient = clientRows[0];

    return {
      salesToday,
      salesMonth,
      totalIncome,
      totalExpenses,
      pendingIncome,
      pendingExpenses,
      balance: totalIncome - totalExpenses,
      topProductName: topProduct?.name || "—",
      topProductQty: topProduct?.quantity || 0,
      topClientName: topClient?.client_name || "—",
      topClientRevenue: topClient?.total_revenue || 0,
    };
  }, [salesRows, financialRows, productRows, clientRows]);

  const paginatedSales = paginate(salesRows, salesPage, PAGE_SIZE);
  const paginatedFinancial = paginate(financialRows, financialPage, PAGE_SIZE);
  const paginatedProducts = paginate(productRows, productsPage, PAGE_SIZE);
  const paginatedClients = paginate(clientRows, clientsPage, PAGE_SIZE);

  const salesPages = Math.max(1, Math.ceil(salesRows.length / PAGE_SIZE));
  const financialPages = Math.max(1, Math.ceil(financialRows.length / PAGE_SIZE));
  const productPages = Math.max(1, Math.ceil(productRows.length / PAGE_SIZE));
  const clientPages = Math.max(1, Math.ceil(clientRows.length / PAGE_SIZE));

  function exportSalesCsv() {
    downloadCsv(
      "relatorio-vendas.csv",
      [
        "Pedido",
        "Cliente",
        "Data do evento",
        "Criado em",
        "Recebimento",
        "Itens",
        "Subtotal",
        "Frete",
        "Custos",
        "Total",
        "Status",
      ],
      salesRows.map((row) => [
        row.order_number,
        row.client_name,
        formatDate(row.event_date),
        formatDateTime(row.created_at),
        row.receive_mode === "delivery" ? "Entrega" : "Retirada",
        row.items_count,
        row.products_subtotal,
        row.delivery_fee,
        row.extra_cost_total,
        row.total_amount,
        getStatusLabel(row.order_status),
      ])
    );
  }

  function exportFinancialCsv() {
    downloadCsv(
      "relatorio-financeiro.csv",
      ["Data", "Tipo", "Origem", "Título", "Categoria", "Forma", "Status", "Valor", "Pedido"],
      financialRows.map((row) => [
        formatDate(row.date),
        row.type,
        row.origin,
        row.title,
        row.category,
        row.payment_method,
        row.status,
        row.amount,
        row.related_order_number || "",
      ])
    );
  }

  function exportProductsCsv() {
    downloadCsv(
      "relatorio-produtos.csv",
      ["Produto / Tema", "Quantidade", "Pedidos", "Receita"],
      productRows.map((row) => [row.name, row.quantity, row.orders_count, row.revenue])
    );
  }

  function exportClientsCsv() {
    downloadCsv(
      "relatorio-clientes.csv",
      ["Cliente", "Telefone", "Pedidos", "Receita", "Custos", "Lucro estimado", "Ticket médio", "Último pedido"],
      clientRows.map((row) => [
        row.client_name,
        row.client_phone,
        row.total_orders,
        row.total_revenue,
        row.total_costs,
        row.estimated_profit,
        row.average_ticket,
        formatDate(row.last_order_date),
      ])
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando relatórios...
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
                  Relatórios
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                  Central de relatórios do DecorFlow com visão de vendas, financeiro, produtos, clientes e exportação para Excel via CSV.
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

            <div className="mt-6 grid gap-3 xl:grid-cols-6">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, pedido, produto..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
              </div>

              <InputDate
                label="De"
                value={dateFrom}
                onChange={setDateFrom}
              />

              <InputDate
                label="Até"
                value={dateTo}
                onChange={setDateTo}
              />

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

              <Select
                value={orderStatusFilter}
                onChange={(value) => setOrderStatusFilter(value)}
                options={[
                  { value: "all", label: "Todos status" },
                  { value: "new", label: "Novo" },
                  { value: "awaiting_confirmation", label: "Aguardando confirmação" },
                  { value: "confirmed", label: "Confirmado" },
                  { value: "in_production", label: "Em produção" },
                  { value: "ready", label: "Pronto" },
                  { value: "completed", label: "Concluído" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <TabButton
                active={tab === "overview"}
                onClick={() => setTab("overview")}
                icon={<BarChart3 className="h-4 w-4" />}
                label="Visão geral"
              />
              <TabButton
                active={tab === "sales"}
                onClick={() => setTab("sales")}
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Vendas"
              />
              <TabButton
                active={tab === "financial"}
                onClick={() => setTab("financial")}
                icon={<Wallet className="h-4 w-4" />}
                label="Financeiro"
              />
              <TabButton
                active={tab === "products"}
                onClick={() => setTab("products")}
                icon={<Tags className="h-4 w-4" />}
                label="Produtos / Temas"
              />
              <TabButton
                active={tab === "clients"}
                onClick={() => setTab("clients")}
                icon={<Users className="h-4 w-4" />}
                label="Clientes"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            {tab === "overview" ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Vendas no dia"
                    value={formatCurrency(overviewMetrics.salesToday)}
                    tone="emerald"
                  />
                  <MetricCard
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Vendas no período"
                    value={formatCurrency(overviewMetrics.salesMonth)}
                    tone="blue"
                  />
                  <MetricCard
                    icon={<ArrowDownCircle className="h-5 w-5" />}
                    label="Saídas no período"
                    value={formatCurrency(overviewMetrics.totalExpenses)}
                    tone="rose"
                  />
                  <MetricCard
                    icon={<Clock3 className="h-5 w-5" />}
                    label="Entradas pendentes"
                    value={formatCurrency(overviewMetrics.pendingIncome)}
                    tone="amber"
                  />
                  <MetricCard
                    icon={<Wallet className="h-5 w-5" />}
                    label="Saldo do período"
                    value={formatCurrency(overviewMetrics.balance)}
                    tone="slate"
                  />
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <BlockCard
                    title="Destaques do período"
                    subtitle="Resumo executivo do que mais se destacou."
                    icon={<BarChart3 className="h-5 w-5 text-slate-700" />}
                  >
                    <div className="space-y-3">
                      <InfoRow
                        label="Produto / tema que mais saiu"
                        value={`${overviewMetrics.topProductName} (${overviewMetrics.topProductQty})`}
                      />
                      <InfoRow
                        label="Melhor cliente do período"
                        value={`${overviewMetrics.topClientName} • ${formatCurrency(
                          overviewMetrics.topClientRevenue
                        )}`}
                      />
                      <InfoRow
                        label="Entradas totais"
                        value={formatCurrency(overviewMetrics.totalIncome)}
                      />
                      <InfoRow
                        label="Saídas totais"
                        value={formatCurrency(overviewMetrics.totalExpenses)}
                      />
                      <InfoRow
                        label="Saídas pendentes"
                        value={formatCurrency(overviewMetrics.pendingExpenses)}
                      />
                    </div>
                  </BlockCard>

                  <BlockCard
                    title="Resumo financeiro"
                    subtitle="Leitura rápida do caixa e das projeções."
                    icon={<Wallet className="h-5 w-5 text-slate-700" />}
                  >
                    <div className="space-y-3">
                      <InfoRow
                        label="Entradas recebidas"
                        value={formatCurrency(
                          financialRows
                            .filter((row) => row.type === "entrada" && row.status === "received")
                            .reduce((acc, row) => acc + row.amount, 0)
                        )}
                      />
                      <InfoRow
                        label="Entradas pendentes"
                        value={formatCurrency(overviewMetrics.pendingIncome)}
                      />
                      <InfoRow
                        label="Receitas futuras"
                        value={formatCurrency(
                          filteredOrders
                            .filter((order) => {
                              const compareDate = order.event_date || order.created_at?.slice(0, 10) || "";
                              return compareDate > todayDate();
                            })
                            .reduce((acc, order) => acc + Number(order.total_amount || 0), 0)
                        )}
                      />
                      <InfoRow
                        label="Saldo estimado"
                        value={formatCurrency(
                          overviewMetrics.balance +
                            overviewMetrics.pendingIncome -
                            overviewMetrics.pendingExpenses
                        )}
                      />
                    </div>
                  </BlockCard>
                </div>
              </div>
            ) : null}

            {tab === "sales" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Relatório de vendas
                    </h2>
                    <p className="text-sm text-slate-500">
                      Pedidos do período com subtotal, frete, custos e total.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exportSalesCsv}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel (CSV)
                  </button>
                </div>

                <TableContainer>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Recebimento</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead align="right">Subtotal</TableHead>
                        <TableHead align="right">Frete</TableHead>
                        <TableHead align="right">Custos</TableHead>
                        <TableHead align="right">Total</TableHead>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {paginatedSales.length === 0 ? (
                        <EmptyTableRow colSpan={10} text="Nenhuma venda encontrada." />
                      ) : (
                        paginatedSales.map((row) => (
                          <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                            <TableCell strong>{row.order_number}</TableCell>
                            <TableCell>{row.client_name}</TableCell>
                            <TableCell>{formatDate(row.event_date || row.created_at)}</TableCell>
                            <TableCell>
                              {row.receive_mode === "delivery" ? "Entrega" : "Retirada"}
                            </TableCell>
                            <TableCell>{row.items_count}</TableCell>
                            <TableCell>{getStatusLabel(row.order_status)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.products_subtotal)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.delivery_fee)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.extra_cost_total)}</TableCell>
                            <TableCell align="right" strong>
                              {formatCurrency(row.total_amount)}
                            </TableCell>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </TableContainer>

                <Pagination
                  page={salesPage}
                  totalPages={salesPages}
                  onChange={setSalesPage}
                />
              </div>
            ) : null}

            {tab === "financial" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Relatório financeiro
                    </h2>
                    <p className="text-sm text-slate-500">
                      Entradas, saídas, custos de pedido e movimentações manuais.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="min-w-[220px]">
                      <Select
                        value={financialTypeFilter}
                        onChange={(value) =>
                          setFinancialTypeFilter(value as typeof financialTypeFilter)
                        }
                        options={[
                          { value: "all", label: "Entradas e saídas" },
                          { value: "entrada", label: "Somente entradas" },
                          { value: "saida", label: "Somente saídas" },
                        ]}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={exportFinancialCsv}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Excel (CSV)
                    </button>
                  </div>
                </div>

                <TableContainer>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Forma</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead align="right">Valor</TableHead>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {paginatedFinancial.length === 0 ? (
                        <EmptyTableRow colSpan={8} text="Nenhuma movimentação encontrada." />
                      ) : (
                        paginatedFinancial.map((row) => (
                          <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  row.type === "entrada"
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border border-rose-200 bg-rose-50 text-rose-700"
                                }`}
                              >
                                {row.type === "entrada" ? "Entrada" : "Saída"}
                              </span>
                            </TableCell>
                            <TableCell>{row.origin}</TableCell>
                            <TableCell strong>{row.title}</TableCell>
                            <TableCell>{row.category}</TableCell>
                            <TableCell>{row.payment_method}</TableCell>
                            <TableCell>{getStatusLabel(row.status)}</TableCell>
                            <TableCell
                              align="right"
                              strong
                              className={
                                row.type === "entrada"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }
                            >
                              {row.type === "entrada" ? "+" : "-"} {formatCurrency(row.amount)}
                            </TableCell>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </TableContainer>

                <Pagination
                  page={financialPage}
                  totalPages={financialPages}
                  onChange={setFinancialPage}
                />
              </div>
            ) : null}

            {tab === "products" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Relatório de produtos / temas
                    </h2>
                    <p className="text-sm text-slate-500">
                      Produtos mais vendidos, quantidade e valor gerado.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exportProductsCsv}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel (CSV)
                  </button>
                </div>

                <TableContainer>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <TableHead>Produto / tema</TableHead>
                        <TableHead>Quantidade vendida</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead align="right">Receita</TableHead>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {paginatedProducts.length === 0 ? (
                        <EmptyTableRow colSpan={4} text="Nenhum produto encontrado." />
                      ) : (
                        paginatedProducts.map((row) => (
                          <tr key={row.name} className="border-b border-slate-200 last:border-b-0">
                            <TableCell strong>{row.name}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{row.orders_count}</TableCell>
                            <TableCell align="right" strong>
                              {formatCurrency(row.revenue)}
                            </TableCell>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </TableContainer>

                <div>
                  <h3 className="mb-3 text-base font-semibold text-slate-950">
                    Ranking por categoria / item
                  </h3>

                  <TableContainer>
                    <table className="min-w-full border-collapse">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <TableHead>Categoria / item</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead align="right">Receita</TableHead>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {categoryRows.length === 0 ? (
                          <EmptyTableRow colSpan={3} text="Nenhuma categoria encontrada." />
                        ) : (
                          categoryRows.slice(0, 20).map((row) => (
                            <tr
                              key={row.category}
                              className="border-b border-slate-200 last:border-b-0"
                            >
                              <TableCell strong>{row.category}</TableCell>
                              <TableCell>{row.quantity}</TableCell>
                              <TableCell align="right" strong>
                                {formatCurrency(row.revenue)}
                              </TableCell>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </TableContainer>
                </div>

                <Pagination
                  page={productsPage}
                  totalPages={productPages}
                  onChange={setProductsPage}
                />
              </div>
            ) : null}

            {tab === "clients" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Relatório de clientes
                    </h2>
                    <p className="text-sm text-slate-500">
                      Clientes que mais compram, receita gerada e ticket médio.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exportClientsCsv}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel (CSV)
                  </button>
                </div>

                <TableContainer>
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <TableHead>Cliente</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead align="right">Receita</TableHead>
                        <TableHead align="right">Custos</TableHead>
                        <TableHead align="right">Lucro estimado</TableHead>
                        <TableHead align="right">Ticket médio</TableHead>
                        <TableHead>Último pedido</TableHead>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {paginatedClients.length === 0 ? (
                        <EmptyTableRow colSpan={8} text="Nenhum cliente encontrado." />
                      ) : (
                        paginatedClients.map((row) => (
                          <tr key={`${row.client_name}-${row.client_phone}`} className="border-b border-slate-200 last:border-b-0">
                            <TableCell strong>{row.client_name}</TableCell>
                            <TableCell>{row.client_phone || "—"}</TableCell>
                            <TableCell>{row.total_orders}</TableCell>
                            <TableCell align="right">{formatCurrency(row.total_revenue)}</TableCell>
                            <TableCell align="right">{formatCurrency(row.total_costs)}</TableCell>
                            <TableCell align="right" strong>
                              {formatCurrency(row.estimated_profit)}
                            </TableCell>
                            <TableCell align="right">{formatCurrency(row.average_ticket)}</TableCell>
                            <TableCell>{formatDate(row.last_order_date)}</TableCell>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </TableContainer>

                <Pagination
                  page={clientsPage}
                  totalPages={clientPages}
                  onChange={setClientsPage}
                />
              </div>
            ) : null}
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

function InputDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BlockCard({
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
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

function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
  strong = false,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  strong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-4 text-${align} text-sm ${
        strong ? "font-semibold text-slate-900" : "text-slate-700"
      } ${className}`}
    >
      {children}
    </td>
  );
}

function EmptyTableRow({
  colSpan,
  text,
}: {
  colSpan: number;
  text: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500">
        {text}
      </td>
    </tr>
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

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        Página {page} de {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>

        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}