"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Clock3,
  FileSignature,
  Loader2,
  MapPin,
  Package,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Users,
} from "lucide-react";

type CompanyRow = Record<string, any>;
type GenericRow = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function safeNumber(...values: any[]) {
  for (const value of values) {
    if (typeof value === "number" && !Number.isNaN(value)) return value;

    if (typeof value === "string" && value.trim()) {
      const normalized = Number(
        value
          .replace(/[R$\s]/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
      );
      if (!Number.isNaN(normalized)) return normalized;
    }
  }

  return 0;
}

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeStatus(value?: string | null) {
  const raw = (value || "").toLowerCase().trim();

  if (!raw) return "sem_status";

  if (["new", "novo", "pending"].includes(raw)) {
    return "novo";
  }

  if (
    ["awaiting_confirmation", "aguardando_confirmacao", "aguardando confirmação"].includes(raw)
  ) {
    return "aguardando_confirmacao";
  }

  if (["confirmed", "confirmado"].includes(raw)) {
    return "confirmado";
  }

  if (
    ["in_production", "em_producao", "em produção", "processing", "processando"].includes(raw)
  ) {
    return "em_producao";
  }

  if (["ready", "pronto"].includes(raw)) {
    return "pronto";
  }

  if (
    [
      "completed",
      "concluido",
      "concluído",
      "finalizado",
      "assinado",
      "signed",
    ].includes(raw)
  ) {
    return "concluido";
  }

  if (["cancelled", "canceled", "cancelado"].includes(raw)) {
    return "cancelado";
  }

  if (["sent", "enviado"].includes(raw)) {
    return "enviado";
  }

  return raw;
}

function statusLabel(status: string) {
  switch (status) {
    case "novo":
      return "Novo";
    case "aguardando_confirmacao":
      return "Aguardando confirmação";
    case "confirmado":
      return "Confirmado";
    case "em_producao":
      return "Em produção";
    case "pronto":
      return "Pronto";
    case "concluido":
      return "Concluído";
    case "cancelado":
      return "Cancelado";
    case "enviado":
      return "Enviado";
    default:
      return "Sem status";
  }
}

function getOrderTotal(row: GenericRow) {
  return safeNumber(
    row.total,
    row.total_amount,
    row.grand_total,
    row.valor_total,
    row.amount,
    row.order_total,
    row.valor
  );
}

function getFreight(row: GenericRow) {
  return safeNumber(
    row.freight,
    row.shipping_amount,
    row.delivery_fee,
    row.valor_frete,
    row.frete
  );
}

function getExtraCost(row: GenericRow) {
  return safeNumber(
    row.extra_cost,
    row.extra_costs,
    row.custo_extra,
    row.custos_extras
  );
}

function getOrderStatus(row: GenericRow) {
  return normalizeStatus(
    firstString(
      row.status,
      row.order_status,
      row.contract_status,
      row.signature_status
    )
  );
}

function getClientName(row: GenericRow) {
  return firstString(
    row.client_name,
    row.customer_name,
    row.nome_cliente,
    row.customer,
    row.name,
    row.nome
  );
}

function getProductName(row: GenericRow) {
  return firstString(
    row.product_name,
    row.nome_produto,
    row.name,
    row.nome
  );
}

function getCreatedAt(row: GenericRow) {
  return firstString(
    row.created_at,
    row.order_date,
    row.date,
    row.data_pedido,
    row.inserted_at
  );
}

function getOrderCode(row: GenericRow) {
  return firstString(
    row.order_code,
    row.code,
    row.pedido_codigo,
    row.number,
    row.numero
  );
}

function isDeliveryOrder(row: GenericRow) {
  const value = firstString(
    row.delivery_type,
    row.receiving_type,
    row.fulfillment_type,
    row.receive_type,
    row.recebimento,
    row.delivery_mode
  ).toLowerCase();

  return value.includes("entrega") || value.includes("delivery");
}

function hasUsefulOrderShape(row: GenericRow) {
  return Boolean(
    getOrderTotal(row) ||
      getClientName(row) ||
      getOrderCode(row) ||
      firstString(row.contract_title, row.title)
  );
}

async function fetchBestTableRows(
  tableNames: string[],
  companyId?: string | null,
  preferNonEmpty = true
) {
  let fallback: { table: string | null; rows: GenericRow[] } = {
    table: null,
    rows: [],
  };

  for (const table of tableNames) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(2000);

      if (error) continue;

      const allRows = (data || []) as GenericRow[];

      const rows = allRows.filter((row) => {
        if (!companyId) return true;
        if ("company_id" in row) return row.company_id === companyId;
        return true;
      });

      if (!fallback.table) {
        fallback = { table, rows };
      }

      if (!preferNonEmpty) {
        return { table, rows };
      }

      if (rows.length > 0) {
        return { table, rows };
      }
    } catch {}
  }

  return fallback;
}

async function fetchBestOrders(companyId: string) {
const candidates = [
  "decor_orders",
  "pedidos",
  "orders",
  "decorflow_orders",
  "contract_requests",
  "signature_requests",
];

  let fallback: { table: string | null; rows: GenericRow[] } = {
    table: null,
    rows: [],
  };

  for (const table of candidates) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(2000);

      if (error) continue;

      const allRows = (data || []) as GenericRow[];

      const rows = allRows.filter((row) => {
        if ("company_id" in row) return row.company_id === companyId;
        return true;
      });

      const usefulRows = rows.filter(hasUsefulOrderShape);

      if (!fallback.table) {
        fallback = { table, rows: usefulRows.length ? usefulRows : rows };
      }

      if (usefulRows.length > 0) {
        return { table, rows: usefulRows };
      }

      if (rows.length > 0) {
        fallback = { table, rows };
      }
    } catch {}
  }

  return fallback;
}

export default function DecorFlowDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<CompanyRow | null>(null);

  const [orders, setOrders] = useState<GenericRow[]>([]);
  const [clients, setClients] = useState<GenericRow[]>([]);
  const [products, setProducts] = useState<GenericRow[]>([]);
  const [categories, setCategories] = useState<GenericRow[]>([]);
  const [subcategories, setSubcategories] = useState<GenericRow[]>([]);
  const [orderItems, setOrderItems] = useState<GenericRow[]>([]);

  const [ordersTableUsed, setOrdersTableUsed] = useState("");
  const [itemsTableUsed, setItemsTableUsed] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Não foi possível identificar o usuário logado.");
        return;
      }

      const { data: membershipRows, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1);

      if (membershipError || !membershipRows?.[0]?.company_id) {
        setError("Nenhuma empresa vinculada foi encontrada para este usuário.");
        return;
      }

      const companyId = membershipRows[0].company_id as string;

      const { data: companyRows } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .limit(1);

      setCompany(companyRows?.[0] || null);

      const [
        ordersResult,
        clientsResult,
        productsResult,
        categoriesResult,
        subcategoriesResult,
        itemsResult,
      ] = await Promise.all([
        fetchBestOrders(companyId),
        fetchBestTableRows(["clients", "clientes"], companyId),
        fetchBestTableRows(["decor_products", "products", "produtos"], companyId),
        fetchBestTableRows(
          ["decor_categories", "categories", "categorias"],
          companyId
        ),
        fetchBestTableRows(["decor_subcategories", "subcategories"], companyId),
        fetchBestTableRows(
          [
            "order_items",
            "pedido_itens",
            "pedido_items",
            "decor_order_items",
          ],
          companyId
        ),
      ]);

      setOrders(ordersResult.rows || []);
      setClients(clientsResult.rows || []);
      setProducts(productsResult.rows || []);
      setCategories(categoriesResult.rows || []);
      setSubcategories(subcategoriesResult.rows || []);
      setOrderItems(itemsResult.rows || []);

      setOrdersTableUsed(ordersResult.table || "");
      setItemsTableUsed(itemsResult.table || "");
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalClients = clients.length;
    const totalProducts = products.length;
    const totalCategories = categories.length;
    const totalSubcategories = subcategories.length;

    let revenue = 0;
    let freight = 0;
    let extras = 0;
    let signedContracts = 0;
    let deliveries = 0;
    let newOrders = 0;

    const byStatusMap = new Map<string, number>();
    const byMonthMap = new Map<string, number>();
    const clientsMap = new Map<
      string,
      { name: string; total: number; value: number }
    >();
    const productsMap = new Map<string, { name: string; total: number }>();

    const now = new Date();
    const monthBuckets: { key: string; label: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      monthBuckets.push({ key, label: monthLabel(d) });
      byMonthMap.set(key, 0);
    }

    for (const row of orders) {
      const total = getOrderTotal(row);
      const ship = getFreight(row);
      const extra = getExtraCost(row);
      const status = getOrderStatus(row);
      const clientName = getClientName(row) || "Cliente não identificado";

      revenue += total;
      freight += ship;
      extras += extra;

      if (status === "assinado") signedContracts += 1;
      if (status === "novo") newOrders += 1;
      if (isDeliveryOrder(row)) deliveries += 1;

      byStatusMap.set(status, (byStatusMap.get(status) || 0) + 1);

      const createdAt = getCreatedAt(row);
      if (createdAt) {
        const d = new Date(createdAt);
        if (!Number.isNaN(d.getTime())) {
          const monthKey = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}`;
          if (byMonthMap.has(monthKey)) {
            byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + total);
          }
        }
      }

      const currentClient = clientsMap.get(clientName) || {
        name: clientName,
        total: 0,
        value: 0,
      };
      currentClient.total += 1;
      currentClient.value += total;
      clientsMap.set(clientName, currentClient);
    }

    for (const item of orderItems) {
      const productName = getProductName(item);
      if (!productName) continue;

      const current = productsMap.get(productName) || {
        name: productName,
        total: 0,
      };

      current.total +=
        safeNumber(item.quantity, item.qty, item.quantidade, 1) || 1;

      productsMap.set(productName, current);
    }

    const byStatus = Array.from(byStatusMap.entries())
      .map(([status, total]) => ({
        status,
        label: statusLabel(status),
        total,
      }))
      .sort((a, b) => b.total - a.total);

    const revenueByMonth = monthBuckets.map((bucket) => ({
      label: bucket.label,
      value: byMonthMap.get(bucket.key) || 0,
    }));

    const topClients = Array.from(clientsMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topProducts = Array.from(productsMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const averageTicket = totalOrders > 0 ? revenue / totalOrders : 0;

    return {
      totalOrders,
      totalClients,
      totalProducts,
      totalCategories,
      totalSubcategories,
      revenue,
      freight,
      extras,
      signedContracts,
      deliveries,
      newOrders,
      averageTicket,
      byStatus,
      revenueByMonth,
      topClients,
      topProducts,
    };
  }, [orders, clients, products, categories, subcategories, orderItems]);

  const companyName = firstString(
    company?.fantasy_name,
    company?.trade_name,
    company?.name,
    "Minha empresa"
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] p-4 sm:p-6">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando painel do DecorFlow...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-base font-semibold">Erro ao carregar o painel</p>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="relative px-5 py-5 sm:px-7 sm:py-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.10),transparent_35%),radial-gradient(circle_at_left,rgba(16,185,129,0.10),transparent_30%)]" />
            <div className="relative grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel executivo
                </div>

                <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[38px] sm:leading-[1.05]">
                  Visão completa da operação do {companyName}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                  Acompanhe pedidos, contratos, entregas, receita, clientes,
                  catálogo e performance comercial em uma visão premium,
                  pensada para o DecorFlow.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {ordersTableUsed ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Pedidos: {ordersTableUsed}
                    </span>
                  ) : null}
                  {itemsTableUsed ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Itens: {itemsTableUsed}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <QuickMiniCard
                  label="Empresa"
                  value={companyName}
                  icon={Sparkles}
                />
                <QuickMiniCard
                  label="Pedidos"
                  value={String(metrics.totalOrders)}
                  icon={ReceiptText}
                />
                <QuickMiniCard
                  label="Clientes"
                  value={String(metrics.totalClients)}
                  icon={Users}
                />
                <QuickMiniCard
                  label="Produtos"
                  value={String(metrics.totalProducts)}
                  icon={Package}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Receita prevista"
            value={formatMoney(metrics.revenue)}
            subtitle="Soma dos pedidos carregados"
            icon={CircleDollarSign}
          />
          <MetricCard
            title="Ticket médio"
            value={formatMoney(metrics.averageTicket)}
            subtitle="Valor médio por pedido"
            icon={BarChart3}
          />
          <MetricCard
            title="Contratos assinados"
            value={String(metrics.signedContracts)}
            subtitle="Pedidos com status assinado/finalizado"
            icon={FileSignature}
          />
          <MetricCard
            title="Entregas"
            value={String(metrics.deliveries)}
            subtitle="Pedidos com retirada por entrega"
            icon={Truck}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <PanelCard
            title="Receita dos últimos meses"
            subtitle="Evolução resumida com base na data de criação dos pedidos."
            icon={BarChart3}
          >
            <RevenueBars data={metrics.revenueByMonth} />
          </PanelCard>

          <PanelCard
            title="Status dos pedidos"
            subtitle="Distribuição operacional do funil atual."
            icon={Clock3}
          >
            <StatusBars data={metrics.byStatus} />
          </PanelCard>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <PanelCard
            title="Indicadores operacionais"
            subtitle="Resumo direto da base atual conectada."
            icon={Boxes}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniStat
                label="Pedidos novos"
                value={String(metrics.newOrders)}
                helper="Aguardando avanço"
              />
              <MiniStat
                label="Frete acumulado"
                value={formatMoney(metrics.freight)}
                helper="Somatório de entregas"
              />
              <MiniStat
                label="Custos extras"
                value={formatMoney(metrics.extras)}
                helper="Custos adicionais lançados"
              />
              <MiniStat
                label="Categorias"
                value={String(metrics.totalCategories)}
                helper="Categorias do catálogo"
              />
              <MiniStat
                label="Subcategorias"
                value={String(metrics.totalSubcategories)}
                helper="Temas e agrupamentos"
              />
              <MiniStat
                label="Produtos"
                value={String(metrics.totalProducts)}
                helper="Itens do catálogo"
              />
            </div>
          </PanelCard>

          <PanelCard
            title="Resumo estratégico"
            subtitle="Leituras rápidas para gestão do dia a dia."
            icon={Sparkles}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InsightCard
                title="Comercial"
                text={`Seu painel mostra ${metrics.totalOrders} pedido(s) e ticket médio de ${formatMoney(
                  metrics.averageTicket
                )}.`}
              />
              <InsightCard
                title="Entrega"
                text={`${metrics.deliveries} pedido(s) possuem entrega, com frete total de ${formatMoney(
                  metrics.freight
                )}.`}
              />
              <InsightCard
                title="Contratos"
                text={`${metrics.signedContracts} pedido(s) já aparecem como assinados/finalizados.`}
              />
              <InsightCard
                title="Catálogo"
                text={`A operação já conta com ${metrics.totalProducts} produto(s), ${metrics.totalCategories} categoria(s) e ${metrics.totalSubcategories} subcategoria(s).`}
              />
            </div>
          </PanelCard>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <PanelCard
            title="Top clientes"
            subtitle="Quem mais movimenta pedidos no DecorFlow."
            icon={Users}
          >
            <RankingList
              items={metrics.topClients.map((item) => ({
                title: item.name,
                value: `${item.total} pedido(s)`,
                badge: formatMoney(item.value),
              }))}
              emptyLabel="Nenhum cliente com movimentação ainda."
            />
          </PanelCard>

          <PanelCard
            title="Produtos mais pedidos"
            subtitle="Ranking com base nos itens dos pedidos."
            icon={ShoppingBag}
          >
            <RankingList
              items={metrics.topProducts.map((item) => ({
                title: item.name,
                value: `${item.total} unidade(s)`,
                badge: "Mais pedido",
              }))}
              emptyLabel="Nenhum item de pedido encontrado ainda."
            />
          </PanelCard>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SoftInfoCard
            title="Presença da empresa"
            icon={MapPin}
            lines={[
              firstString(
                company?.address,
                company?.endereco,
                "Endereço não informado"
              ),
              firstString(company?.city, company?.cidade, ""),
              firstString(company?.state, company?.estado, ""),
            ].filter(Boolean)}
          />

          <SoftInfoCard
            title="Catálogo"
            icon={Tag}
            lines={[
              `${metrics.totalProducts} produto(s) carregado(s)`,
              `${metrics.totalCategories} categoria(s) encontrada(s)`,
              `${metrics.totalSubcategories} subcategoria(s) encontradas`,
            ]}
          />

          <SoftInfoCard
            title="Financeiro"
            icon={CircleDollarSign}
            lines={[
              `Receita total: ${formatMoney(metrics.revenue)}`,
              `Frete total: ${formatMoney(metrics.freight)}`,
              `Extras: ${formatMoney(metrics.extras)}`,
            ]}
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[30px]">
            {value}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>

        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-base font-semibold tracking-[-0.02em] text-slate-950">
              {title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function RevenueBars({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid grid-cols-6 items-end gap-2 sm:gap-3">
      {data.map((item) => {
        const height = Math.max((item.value / max) * 220, 10);

        return (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div className="text-center text-[11px] font-semibold text-slate-500">
              {formatMoney(item.value)}
            </div>

            <div className="flex h-[240px] w-full items-end justify-center rounded-2xl bg-slate-50 px-1 py-2">
              <div
                className="w-full rounded-2xl bg-[linear-gradient(180deg,#4338ca_0%,#6366f1_45%,#22c55e_100%)] shadow-[0_10px_24px_rgba(99,102,241,0.22)]"
                style={{ height }}
              />
            </div>

            <div className="text-xs font-medium text-slate-600">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBars({
  data,
}: {
  data: Array<{ status: string; label: string; total: number }>;
}) {
  const max = Math.max(...data.map((item) => item.total), 1);

  if (!data.length) {
    return (
      <p className="text-sm text-slate-500">
        Ainda não há pedidos suficientes para exibir este gráfico.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.status} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">{item.label}</p>
            <p className="text-sm font-semibold text-slate-950">{item.total}</p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#4f46e5_55%,#14b8a6_100%)]"
              style={{ width: `${Math.max((item.total / max) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingList({
  items,
  emptyLabel,
}: {
  items: Array<{ title: string; value: string; badge: string }>;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {item.title}
            </p>
            <p className="mt-1 text-sm text-slate-500">{item.value}</p>
          </div>

          <div className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {item.badge}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function InsightCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function SoftInfoCard({
  title,
  icon: Icon,
  lines,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  lines: string[];
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-base font-semibold tracking-[-0.02em] text-slate-950">
          {title}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {lines.map((line, index) => (
          <p
            key={`${title}-${index}`}
            className="text-sm leading-6 text-slate-600"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function QuickMiniCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}