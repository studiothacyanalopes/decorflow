"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  FileSignature,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
  Sparkles,
  Clock3,
  MessageCircle,
  StickyNote,
  Boxes,
  Printer,
  Building2,
  Mail,
  FileText,
  UserCircle2,
  Link2,
  Send,
  X,
  UserPlus,
  Camera,
  IdCard,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompanyContext = {
  id: string;
  name: string;
  raw?: Record<string, any> | null;
};

type OrderStatus =
  | "new"
  | "awaiting_confirmation"
  | "confirmed"
  | "in_production"
  | "ready"
  | "completed"
  | "cancelled";

type DeliveryStatus =
  | "pending"
  | "separating"
  | "out_for_delivery"
  | "delivered"
  | "picked_up"
  | "cancelled";

type ContractStatus = "not_sent" | "sent" | "viewed" | "signed" | "refused";

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
  order_status: OrderStatus;
  delivery_status: DeliveryStatus;
  contract_status: ContractStatus;
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

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

type DetailTab = "overview" | "items" | "contract" | "costs" | "notes";

type SignatureSignerDraft = {
  id: string;
  role: "client" | "internal" | "extra";
  name: string;
  phone: string;
  phone_country_code: string;
  email?: string;
  require_selfie: boolean;
  require_document_front: boolean;
  require_document_back: boolean;
};

type SignatureLinkItem = {
  signer_id: string;
  role: "client" | "internal" | "extra";
  name: string;
  phone: string;
  token: string;
  signature_url: string;
  whatsapp_url: string;
};

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "Novo" },
  { value: "awaiting_confirmation", label: "Aguardando confirmação" },
  { value: "confirmed", label: "Confirmado" },
  { value: "in_production", label: "Em produção" },
  { value: "ready", label: "Pronto" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "separating", label: "Separando" },
  { value: "out_for_delivery", label: "Saiu para entrega" },
  { value: "delivered", label: "Entregue" },
  { value: "picked_up", label: "Retirado" },
  { value: "cancelled", label: "Cancelado" },
];

const CONTRACT_STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "not_sent", label: "Não enviado" },
  { value: "sent", label: "Enviado" },
  { value: "viewed", label: "Visualizado" },
  { value: "signed", label: "Assinado" },
  { value: "refused", label: "Recusado" },
];

const DEFAULT_CONTRACT_CLAUSES = [
  "1.1 O cliente será responsável por qualquer dano causado aos materiais locados.",
  "1.2 Será cobrada taxa de limpeza quando os itens retornarem em condição incompatível com o uso normal.",
  "1.3 A locação é válida pelo período informado neste contrato, devendo a devolução ocorrer na data combinada.",
  "1.4 Em caso de atraso na devolução, poderão ser aplicadas taxas adicionais conforme regras da empresa.",
  "1.5 A reserva só será considerada confirmada após a validação do pagamento de entrada, quando aplicável.",
  "1.6 Valores pagos antecipadamente não são reembolsáveis, salvo acordo formal entre as partes.",
  "1.7 Em caso de perda, dano grave ou não devolução, poderá ser cobrado o valor de reposição dos itens.",
  "1.8 O transporte dos materiais poderá ser de responsabilidade do cliente ou da empresa, conforme o tipo de recebimento escolhido no pedido.",
];

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
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatLongDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
    }).format(new Date());
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(date);
}

function normalizePhone(phone?: string | null) {
  return String(phone || "").replace(/\D/g, "");
}

function buildAddressText(address?: DeliveryAddress | null) {
  if (!address) return "Retirada no local";
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

function buildWhatsAppUrl(phone?: string | null, text?: string) {
  const clean = normalizePhone(phone);
  if (!clean) return "#";
  const full = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text || "Olá!")}`;
}

function badgeClass(tone: "slate" | "blue" | "emerald" | "amber" | "rose") {
  const map = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return map[tone];
}

function statusTone(value: string) {
  if (["completed", "delivered", "picked_up", "signed"].includes(value)) {
    return "emerald" as const;
  }
  if (["cancelled", "refused"].includes(value)) {
    return "rose" as const;
  }
  if (["ready", "confirmed", "viewed"].includes(value)) {
    return "blue" as const;
  }
  if (["in_production", "separating", "out_for_delivery", "sent"].includes(value)) {
    return "amber" as const;
  }
  return "slate" as const;
}

function getCompanyField(company?: CompanyContext | null, keys: string[] = []) {
  if (!company?.raw) return "";
  for (const key of keys) {
    const value = company.raw?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function getCompanyDocument(company?: CompanyContext | null) {
  return (
    getCompanyField(company, [
      "cpf_cnpj",
      "document",
      "document_number",
      "cnpj",
      "cpf",
      "owner_document",
    ]) || "—"
  );
}

function getCompanyPhone(company?: CompanyContext | null) {
  return (
    getCompanyField(company, [
      "phone",
      "telefone",
      "whatsapp",
      "mobile_phone",
      "contact_phone",
    ]) || "—"
  );
}

function getCompanyEmail(company?: CompanyContext | null) {
  return (
    getCompanyField(company, [
      "email",
      "contact_email",
      "owner_email",
    ]) || "—"
  );
}

function getCompanyAddress(company?: CompanyContext | null) {
  const line = getCompanyField(company, [
    "address_line",
    "address",
    "street",
    "logradouro",
  ]);
  const number = getCompanyField(company, ["address_number", "number", "numero"]);
  const neighborhood = getCompanyField(company, ["neighborhood", "bairro"]);
  const city = getCompanyField(company, ["city", "cidade"]);
  const state = getCompanyField(company, ["state", "uf"]);
  const zipCode = getCompanyField(company, ["zip_code", "cep"]);

  const text = [line, number, neighborhood, city, state, zipCode]
    .filter(Boolean)
    .join(", ");

  return text || "—";
}

function getContractClauses(order: Order) {
  const clauses = [...DEFAULT_CONTRACT_CLAUSES];

  if (order.receive_mode === "delivery") {
    clauses.push(
      "1.9 Como este pedido possui entrega, o endereço informado pelo cliente é parte integrante deste contrato."
    );
  } else {
    clauses.push(
      "1.9 Como este pedido será retirado, o cliente se compromete a respeitar data e horário combinados para retirada e devolução."
    );
  }

  return clauses;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildContractHtml(params: {
  company: CompanyContext | null;
  order: Order;
  items: OrderItem[];
  extraCosts: number;
}) {
  const { company, order, items, extraCosts } = params;

  const companyName = company?.name || "Minha empresa";
  const companyDocument = getCompanyDocument(company);
  const companyPhone = getCompanyPhone(company);
  const companyEmail = getCompanyEmail(company);
  const companyAddress = getCompanyAddress(company);

  const clientName = order.client_name || "Cliente";
  const clientPhone = order.client_phone || "—";
  const receiveMode = order.receive_mode === "delivery" ? "Entrega" : "Retirada";
  const contractTitle = order.contract_model_name || "Contrato de locação";
  const eventDate = formatDate(order.event_date);
  const createdAt = formatLongDate(order.created_at);
  const deliveryAddress =
    order.receive_mode === "delivery"
      ? buildAddressText(order.delivery_address_json)
      : "Retirada no local";

  const itemsRows =
    items.length > 0
      ? items
          .map(
            (item) => `
          <tr>
            <td>${escapeHtml(String(item.quantity || 0))}</td>
            <td>${escapeHtml(item.product_name || "Item")}</td>
            <td>${escapeHtml(formatCurrency(item.unit_price || 0))}</td>
            <td>${escapeHtml(formatCurrency(item.total_price || 0))}</td>
          </tr>
        `
          )
          .join("")
      : `
        <tr>
          <td colspan="4" style="text-align:center;color:#64748b;padding:18px 10px;">
            Nenhum item lançado neste pedido.
          </td>
        </tr>
      `;

  const clausesHtml = getContractClauses(order)
    .map((clause) => `<p style="margin:0 0 10px 0;line-height:1.7;">${escapeHtml(clause)}</p>`)
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(contractTitle)} - ${escapeHtml(order.order_number)}</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          margin: 0;
          padding: 32px;
          color: #0f172a;
          background: #ffffff;
        }
        .container {
          max-width: 980px;
          margin: 0 auto;
        }
        .top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 20px;
        }
        .title {
          text-align: center;
          font-size: 28px;
          font-weight: 700;
          margin: 30px 0 20px;
        }
        .muted {
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 700;
        }
        .card {
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          padding: 16px;
          margin-top: 18px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .value {
          margin-top: 6px;
          font-size: 16px;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 10px;
          text-align: left;
          font-size: 14px;
        }
        th {
          background: #f8fafc;
          font-weight: 700;
        }
        .signatures {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 32px;
          margin-top: 48px;
        }
        .sign-line {
          border-top: 1px solid #94a3b8;
          padding-top: 10px;
          text-align: center;
        }
        .section-title {
          font-size: 20px;
          font-weight: 700;
          margin: 28px 0 14px;
        }
        @media print {
          body {
            padding: 0;
          }
          .container {
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="top">
          <div>
            <div class="muted">Locador</div>
            <div style="font-size:26px;font-weight:700;margin-top:6px;">${escapeHtml(companyName)}</div>
            <div style="margin-top:8px;line-height:1.7;">
              Documento: ${escapeHtml(companyDocument)}<br />
              Telefone: ${escapeHtml(companyPhone)}<br />
              E-mail: ${escapeHtml(companyEmail)}<br />
              Endereço: ${escapeHtml(companyAddress)}
            </div>
          </div>

          <div style="text-align:right;">
            <div class="muted">Pedido</div>
            <div style="font-size:22px;font-weight:700;margin-top:6px;">${escapeHtml(order.order_number)}</div>
            <div style="margin-top:8px;line-height:1.7;">
              Evento: ${escapeHtml(eventDate)}<br />
              Recebimento: ${escapeHtml(receiveMode)}<br />
              Emissão: ${escapeHtml(createdAt)}
            </div>
          </div>
        </div>

        <div class="title">${escapeHtml(contractTitle)}</div>

        <div class="grid">
          <div class="card">
            <div class="muted">Cliente</div>
            <div class="value">${escapeHtml(clientName)}</div>
            <div style="margin-top:8px;line-height:1.7;">
              Telefone: ${escapeHtml(clientPhone)}<br />
              Tema: ${escapeHtml(order.notes || "Conforme pedido registrado")}
            </div>
          </div>

          <div class="card">
            <div class="muted">Entrega / retirada</div>
            <div class="value">${escapeHtml(receiveMode)}</div>
            <div style="margin-top:8px;line-height:1.7;">
              ${escapeHtml(deliveryAddress)}
            </div>
          </div>
        </div>

        <div class="section-title">Itens do pedido</div>

        <table>
          <thead>
            <tr>
              <th>Qtd.</th>
              <th>Produto</th>
              <th>Unitário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="grid-3" style="margin-top:18px;">
          <div class="card">
            <div class="muted">Subtotal</div>
            <div class="value">${escapeHtml(formatCurrency(order.products_subtotal))}</div>
          </div>
          <div class="card">
            <div class="muted">Frete</div>
            <div class="value">${escapeHtml(formatCurrency(order.delivery_fee))}</div>
          </div>
          <div class="card">
            <div class="muted">Total</div>
            <div class="value">${escapeHtml(formatCurrency(order.total_amount))}</div>
          </div>
        </div>

        <div class="grid-3" style="margin-top:16px;">
          <div class="card">
            <div class="muted">Custos extras</div>
            <div class="value">${escapeHtml(formatCurrency(extraCosts))}</div>
          </div>
          <div class="card">
            <div class="muted">Status do pedido</div>
            <div class="value">${escapeHtml(
              ORDER_STATUS_OPTIONS.find((item) => item.value === order.order_status)?.label ||
                order.order_status
            )}</div>
          </div>
          <div class="card">
            <div class="muted">Status do contrato</div>
            <div class="value">${escapeHtml(
              CONTRACT_STATUS_OPTIONS.find((item) => item.value === order.contract_status)?.label ||
                order.contract_status
            )}</div>
          </div>
        </div>

        <div class="section-title">Cláusulas contratuais</div>
        <div class="card">
          ${clausesHtml}
        </div>

        <div style="margin-top:32px;line-height:1.7;">
          <strong>Observação:</strong> Este documento foi gerado com base nas informações do pedido e nos dados da empresa cadastrados no DecorFlow.
        </div>

        <div style="margin-top:28px;">
          ${escapeHtml(createdAt)}
        </div>

        <div class="signatures">
          <div class="sign-line">
            <div style="font-weight:700;">${escapeHtml(companyName)}</div>
            <div style="margin-top:6px;">Documento: ${escapeHtml(companyDocument)}</div>
          </div>

          <div class="sign-line">
            <div style="font-weight:700;">${escapeHtml(clientName)}</div>
            <div style="margin-top:6px;">Telefone: ${escapeHtml(clientPhone)}</div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

export default function DecorPedidosPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | OrderStatus>("all");
  const [receiveModeFilter, setReceiveModeFilter] = useState<"all" | "pickup" | "delivery">("all");
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const selectedOrderIdRef = useRef<string | null>(null);

  const [costForm, setCostForm] = useState({
    description: "",
    amount: "",
    supplier: "",
    notes: "",
  });

  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
const [creatingSignature, setCreatingSignature] = useState(false);
const [signatureLinks, setSignatureLinks] = useState<SignatureLinkItem[]>([]);
const [signatureSigners, setSignatureSigners] = useState<SignatureSignerDraft[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?.id || null;
  }, [selectedOrder]);

  useEffect(() => {
  if (!selectedOrder) {
    setSignatureSigners([]);
    return;
  }

  setSignatureSigners([
    {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-client`,
      role: "client",
      name: selectedOrder.client_name || "",
      phone: selectedOrder.client_phone || "",
      phone_country_code: "+55",
      email: "",
      require_selfie: false,
      require_document_front: false,
      require_document_back: false,
    },
  ]);
}, [selectedOrder]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`decor-orders-live-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "decor_orders",
          filter: `company_id=eq.${companyId}`,
        },
        async () => {
          await loadOrders(selectedOrderIdRef.current || undefined, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  async function loadOrders(selectedId?: string, showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      setStatus((prev) => (showLoader ? { type: "", message: "" } : prev));

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
        .select("company_id, companies:company_id(*)")
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

      const resolvedCompanyId = membership.company_id;

      setCompanyId(resolvedCompanyId);
      setCompany({
        id: resolvedCompanyId,
        name: companyData?.name || "Minha empresa",
        raw: companyData || null,
      });

      const { data, error } = await supabase
        .from("decor_orders")
        .select(`
          *,
          decor_order_items (*),
          decor_order_costs (*)
        `)
        .eq("company_id", resolvedCompanyId)
        .order("created_at", { ascending: false });

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os pedidos.",
        });
        return;
      }

      const typedOrders = (data || []) as Order[];
      setOrders(typedOrders);

      const nextSelected = selectedId
        ? typedOrders.find((item) => item.id === selectedId) || null
        : selectedOrder
          ? typedOrders.find((item) => item.id === selectedOrder.id) || null
          : typedOrders[0] || null;

      setSelectedOrder(nextSelected);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar os pedidos.",
      });
    } finally {
      if (showLoader) setLoading(false);
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
          order.notes || "",
          ...(order.decor_order_items || []).map((item) => item.product_name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        orderStatusFilter === "all" || order.order_status === orderStatusFilter;

      const matchesReceive =
        receiveModeFilter === "all" || order.receive_mode === receiveModeFilter;

      return matchesSearch && matchesStatus && matchesReceive;
    });
  }, [orders, search, orderStatusFilter, receiveModeFilter]);

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (acc, item) => acc + Number(item.total_amount || 0),
      0
    );
    const totalExtraCosts = orders.reduce(
      (acc, order) =>
        acc +
        (order.decor_order_costs || []).reduce(
          (sum, cost) => sum + Number(cost.amount || 0),
          0
        ),
      0
    );
    const pendingContracts = orders.filter(
      (item) => item.contract_status !== "signed"
    ).length;
    const deliveryCount = orders.filter(
      (item) => item.receive_mode === "delivery"
    ).length;

    return {
      totalOrders,
      totalRevenue,
      totalExtraCosts,
      pendingContracts,
      deliveryCount,
    };
  }, [orders]);

  const selectedExtraCosts = useMemo(() => {
    return (selectedOrder?.decor_order_costs || []).reduce(
      (acc, cost) => acc + Number(cost.amount || 0),
      0
    );
  }, [selectedOrder]);

  const selectedProfitEstimate = useMemo(() => {
    if (!selectedOrder) return 0;
    return Number(selectedOrder.total_amount || 0) - selectedExtraCosts;
  }, [selectedOrder, selectedExtraCosts]);

  async function updateOrderField(
    orderId: string,
    patch: Partial<Order>,
    successMessage: string
  ) {
    try {
      setSavingId(orderId);
      setStatus({ type: "", message: "" });

      const payload: Record<string, unknown> = { ...patch };

      if (patch.contract_status === "sent") {
        payload.contract_sent_at = new Date().toISOString();
      }

      if (patch.contract_status === "signed") {
        payload.contract_signed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("decor_orders")
        .update(payload)
        .eq("id", orderId);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível atualizar o pedido.",
        });
        return;
      }

      setStatus({ type: "success", message: successMessage });
      await loadOrders(orderId, false);
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveNotes(order: Order, notes: string) {
    await updateOrderField(
      order.id,
      { notes },
      "Observações atualizadas com sucesso."
    );
  }

  async function handleAddCost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedOrder) return;

    if (!costForm.description.trim()) {
      setStatus({ type: "error", message: "Informe a descrição do custo." });
      return;
    }

    const amount = Number(costForm.amount || 0);

    if (amount <= 0) {
      setStatus({ type: "error", message: "Informe um valor de custo válido." });
      return;
    }

    try {
      setSavingId(selectedOrder.id);
      setStatus({ type: "", message: "" });

      const { error } = await supabase.from("decor_order_costs").insert({
        order_id: selectedOrder.id,
        description: costForm.description.trim(),
        amount,
        supplier: costForm.supplier.trim() || null,
        notes: costForm.notes.trim() || null,
      });

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível adicionar o custo a este pedido.",
        });
        return;
      }

      const nextCostTotal = selectedExtraCosts + amount;

      const { error: orderError } = await supabase
        .from("decor_orders")
        .update({ extra_cost_total: nextCostTotal })
        .eq("id", selectedOrder.id);

      if (orderError) {
        setStatus({
          type: "error",
          message: "O custo foi criado, mas o total adicional não foi atualizado.",
        });
        return;
      }

      setCostForm({ description: "", amount: "", supplier: "", notes: "" });
      setStatus({ type: "success", message: "Custo adicionado com sucesso." });
      await loadOrders(selectedOrder.id, false);
    } finally {
      setSavingId(null);
    }
  }

  function handlePrintContract() {
    if (!selectedOrder) return;

    const html = buildContractHtml({
      company,
      order: selectedOrder,
      items: selectedOrder.decor_order_items || [],
      extraCosts: selectedExtraCosts,
    });

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      setStatus({
        type: "error",
        message: "Não foi possível abrir a janela de impressão.",
      });
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 300);
  }

  function handleDownloadContractHtml() {
    if (!selectedOrder) return;

    const html = buildContractHtml({
      company,
      order: selectedOrder,
      items: selectedOrder.decor_order_items || [],
      extraCosts: selectedExtraCosts,
    });

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${selectedOrder.order_number || "contrato"}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

function addExtraSigner() {
  setSignatureSigners((prev) => [
    ...prev,
    {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${prev.length}`,
      role: "extra",
      name: "",
      phone: "",
      phone_country_code: "+55",
      email: "",
      require_selfie: false,
      require_document_front: false,
      require_document_back: false,
    },
  ]);
}

function updateSignerDraft(
  id: string,
  patch: Partial<SignatureSignerDraft>
) {
  setSignatureSigners((prev) =>
    prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
  );
}

function removeSignerDraft(id: string) {
  setSignatureSigners((prev) => prev.filter((item) => item.id !== id));
}

async function handleCreateSignatureRequest() {
  if (!selectedOrder || !company) return;

  const validSigners = signatureSigners.filter(
    (item) => item.name.trim() && item.phone.trim()
  );

  if (validSigners.length === 0) {
    setStatus({
      type: "error",
      message: "Informe pelo menos um assinante válido.",
    });
    return;
  }

  try {
    setCreatingSignature(true);
    setStatus({ type: "", message: "" });

    const contractHtml = buildContractHtml({
      company,
      order: selectedOrder,
      items: selectedOrder.decor_order_items || [],
      extraCosts: selectedExtraCosts,
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/contracts/create-signature-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        company_id: company.id,
        order_id: selectedOrder.id,
        contract_title:
          selectedOrder.contract_model_name || "Contrato de locação",
        contract_html: contractHtml,
        signers: validSigners.map((item) => ({
          role: item.role,
          name: item.name,
          phone: item.phone,
          phone_country_code: item.phone_country_code || "+55",
          email: item.email || "",
          require_selfie: item.require_selfie,
          require_document_front: item.require_document_front,
          require_document_back: item.require_document_back,
        })),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      setStatus({
        type: "error",
        message:
          data?.error || "Não foi possível gerar a solicitação de assinatura.",
      });
      return;
    }

    setSignatureLinks(data.links || []);
    setSignatureModalOpen(false);

    setStatus({
      type: "success",
      message:
        "Links de assinatura gerados com sucesso. Agora você pode enviar pelo WhatsApp.",
    });

    await loadOrders(selectedOrder.id, false);
  } catch {
    setStatus({
      type: "error",
      message: "Ocorreu um erro inesperado ao gerar a assinatura.",
    });
  } finally {
    setCreatingSignature(false);
  }
}

  const selectedItems = selectedOrder?.decor_order_items || [];
  const selectedAddress = selectedOrder?.delivery_address_json || null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando pedidos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1680px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#ffffff_40%,#ffffff_100%)] px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  DecorFlow
                </div>

                <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Pedidos
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Painel operacional premium para acompanhar pedidos da página
                  pública, organizar contrato, entrega, custos e andamento do cliente.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Empresa
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {company?.name || "Minha empresa"}
                </p>
                <p className="mt-2 text-xs text-emerald-600">
                  Atualização automática ativa
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
                icon={<ClipboardList className="h-5 w-5" />}
                label="Total de pedidos"
                value={String(metrics.totalOrders)}
                tone="slate"
              />
              <MetricCard
                icon={<Wallet className="h-5 w-5" />}
                label="Valor movimentado"
                value={formatCurrency(metrics.totalRevenue)}
                tone="blue"
              />
              <MetricCard
                icon={<ShoppingBag className="h-5 w-5" />}
                label="Custos extras"
                value={formatCurrency(metrics.totalExtraCosts)}
                tone="amber"
              />
              <MetricCard
                icon={<FileSignature className="h-5 w-5" />}
                label="Contratos pendentes"
                value={String(metrics.pendingContracts)}
                tone="rose"
              />
              <MetricCard
                icon={<Truck className="h-5 w-5" />}
                label="Pedidos com entrega"
                value={String(metrics.deliveryCount)}
                tone="emerald"
              />
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[390px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50/60 xl:border-b-0 xl:border-r">
              <div className="border-b border-slate-200 bg-white/70 p-4 sm:p-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar pedido, cliente, telefone ou item"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </div>

                <div className="mt-3 grid gap-3">
                  <Select
                    value={orderStatusFilter}
                    onChange={(value) =>
                      setOrderStatusFilter(value as typeof orderStatusFilter)
                    }
                    options={[
                      { value: "all", label: "Todos os status" },
                      ...ORDER_STATUS_OPTIONS,
                    ]}
                  />
                  <Select
                    value={receiveModeFilter}
                    onChange={(value) =>
                      setReceiveModeFilter(value as typeof receiveModeFilter)
                    }
                    options={[
                      { value: "all", label: "Entrega e retirada" },
                      { value: "pickup", label: "Somente retirada" },
                      { value: "delivery", label: "Somente entrega" },
                    ]}
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-3 sm:p-4">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center">
                    <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      Nenhum pedido encontrado
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Quando um cliente finalizar pela página pública, ele aparece aqui automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => {
                      const active = selectedOrder?.id === order.id;
                      const itemsCount = (order.decor_order_items || []).reduce(
                        (acc, item) => acc + Number(item.quantity || 0),
                        0
                      );

                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveTab("overview");
                          }}
                          className={`group w-full rounded-[28px] border p-4 text-left transition ${
                            active
                              ? "border-blue-300 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] shadow-[0_18px_40px_rgba(59,130,246,0.12)]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {order.order_number}
                              </p>
                              <h3 className="mt-1 truncate text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
                                {order.client_name}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(order.event_date)} •{" "}
                                {order.receive_mode === "delivery"
                                  ? "Entrega"
                                  : "Retirada"}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(
                                  statusTone(order.order_status)
                                )}`}
                              >
                                {ORDER_STATUS_OPTIONS.find(
                                  (item) => item.value === order.order_status
                                )?.label || order.order_status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <MiniStat label="Total" value={formatCurrency(order.total_amount)} />
                            <MiniStat label="Itens" value={String(itemsCount)} />
                            <MiniStat
                              label="Frete"
                              value={
                                order.receive_mode === "delivery"
                                  ? formatCurrency(order.delivery_fee)
                                  : "—"
                              }
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(
                                statusTone(order.delivery_status)
                              )}`}
                            >
                              {DELIVERY_STATUS_OPTIONS.find(
                                (item) => item.value === order.delivery_status
                              )?.label || order.delivery_status}
                            </span>

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(
                                statusTone(order.contract_status)
                              )}`}
                            >
                              {CONTRACT_STATUS_OPTIONS.find(
                                (item) => item.value === order.contract_status
                              )?.label || order.contract_status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
              {!selectedOrder ? (
                <div className="flex min-h-[560px] items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Selecione um pedido
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Clique em um card para abrir os detalhes completos do pedido.
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
                            Pedido {selectedOrder.order_number}
                          </p>
                          <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
                            {selectedOrder.client_name}
                          </h2>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={buildWhatsAppUrl(
                                selectedOrder.client_phone,
                                `Olá, ${selectedOrder.client_name}! Estou entrando em contato sobre o pedido ${selectedOrder.order_number}.`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Chamar no WhatsApp
                            </a>

                            {selectedOrder.whatsapp_message ? (
                              <a
                                href={buildWhatsAppUrl(
                                  selectedOrder.client_phone,
                                  selectedOrder.whatsapp_message
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Reabrir mensagem
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 xl:w-[440px]">
                          <SelectCard
                            label="Status do pedido"
                            value={selectedOrder.order_status}
                            disabled={savingId === selectedOrder.id}
                            options={ORDER_STATUS_OPTIONS}
                            onChange={(value) =>
                              updateOrderField(
                                selectedOrder.id,
                                { order_status: value as OrderStatus },
                                "Status do pedido atualizado."
                              )
                            }
                          />
                          <SelectCard
                            label="Status da entrega"
                            value={selectedOrder.delivery_status}
                            disabled={savingId === selectedOrder.id}
                            options={DELIVERY_STATUS_OPTIONS}
                            onChange={(value) =>
                              updateOrderField(
                                selectedOrder.id,
                                { delivery_status: value as DeliveryStatus },
                                "Status da entrega atualizado."
                              )
                            }
                          />
                          <SelectCard
                            label="Status do contrato"
                            value={selectedOrder.contract_status}
                            disabled={savingId === selectedOrder.id}
                            options={CONTRACT_STATUS_OPTIONS}
                            onChange={(value) =>
                              updateOrderField(
                                selectedOrder.id,
                                { contract_status: value as ContractStatus },
                                "Status do contrato atualizado."
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <HeroInfoCard
                          icon={<CalendarDays className="h-4 w-4" />}
                          label="Data do evento"
                          value={formatDate(selectedOrder.event_date)}
                        />
                        <HeroInfoCard
                          icon={<Phone className="h-4 w-4" />}
                          label="Telefone"
                          value={selectedOrder.client_phone || "—"}
                        />
                        <HeroInfoCard
                          icon={<Truck className="h-4 w-4" />}
                          label="Recebimento"
                          value={
                            selectedOrder.receive_mode === "delivery"
                              ? "Entrega"
                              : "Retirada"
                          }
                        />
                        <HeroInfoCard
                          icon={<Wallet className="h-4 w-4" />}
                          label="Total do pedido"
                          value={formatCurrency(selectedOrder.total_amount)}
                        />
                      </div>
                    </div>

                    <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
                      <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <TabButton
                          active={activeTab === "overview"}
                          onClick={() => setActiveTab("overview")}
                          icon={<ClipboardList className="h-4 w-4" />}
                          label="Visão geral"
                        />
                        <TabButton
                          active={activeTab === "items"}
                          onClick={() => setActiveTab("items")}
                          icon={<Boxes className="h-4 w-4" />}
                          label="Itens"
                        />
                        <TabButton
                          active={activeTab === "contract"}
                          onClick={() => setActiveTab("contract")}
                          icon={<FileSignature className="h-4 w-4" />}
                          label="Contrato"
                        />
                        <TabButton
                          active={activeTab === "costs"}
                          onClick={() => setActiveTab("costs")}
                          icon={<ShoppingBag className="h-4 w-4" />}
                          label="Custos"
                        />
                        <TabButton
                          active={activeTab === "notes"}
                          onClick={() => setActiveTab("notes")}
                          icon={<StickyNote className="h-4 w-4" />}
                          label="Observações"
                        />
                      </div>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                      {activeTab === "overview" ? (
                        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                          <div className="space-y-5">
                            <PanelCard
                              title="Logística e entrega"
                              subtitle="Endereço, frete, distância e tempo estimado."
                              icon={<MapPin className="h-5 w-5 text-slate-700" />}
                            >
                              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {selectedOrder.receive_mode === "delivery"
                                      ? "Endereço de entrega"
                                      : "Retirada no local"}
                                  </p>
                                  <p className="mt-3 text-sm leading-7 text-slate-600">
                                    {selectedOrder.receive_mode === "delivery"
                                      ? buildAddressText(selectedAddress)
                                      : "Cliente retira no local."}
                                  </p>

                                  {selectedAddress?.reference ? (
                                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                      <span className="font-semibold text-slate-900">
                                        Referência:
                                      </span>{" "}
                                      {selectedAddress.reference}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                  <SmallInfo
                                    label="Frete"
                                    value={formatCurrency(selectedOrder.delivery_fee)}
                                  />
                                  <SmallInfo
                                    label="Distância"
                                    value={
                                      selectedOrder.distance_km != null
                                        ? `${Number(selectedOrder.distance_km).toFixed(2)} km`
                                        : "—"
                                    }
                                  />
                                  <SmallInfo
                                    label="Tempo estimado"
                                    value={
                                      selectedOrder.duration_minutes != null
                                        ? `${selectedOrder.duration_minutes} min`
                                        : "—"
                                    }
                                  />
                                  <SmallInfo
                                    label="Criado em"
                                    value={formatDateTime(selectedOrder.created_at)}
                                  />
                                </div>
                              </div>
                            </PanelCard>

                            <PanelCard
                              title="Resumo financeiro"
                              subtitle="Visual operacional do pedido."
                              icon={<Wallet className="h-5 w-5 text-slate-700" />}
                            >
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <SmallInfo
                                  label="Subtotal produtos"
                                  value={formatCurrency(selectedOrder.products_subtotal)}
                                />
                                <SmallInfo
                                  label="Frete"
                                  value={formatCurrency(selectedOrder.delivery_fee)}
                                />
                                <SmallInfo
                                  label="Custos extras"
                                  value={formatCurrency(selectedExtraCosts)}
                                />
                                <SmallInfo
                                  label="Estimativa líquida"
                                  value={formatCurrency(selectedProfitEstimate)}
                                />
                              </div>
                            </PanelCard>
                          </div>

                          <div className="space-y-5">
                            <PanelCard
                              title="Resumo rápido"
                              subtitle="Status operacional do pedido."
                              icon={<Clock3 className="h-5 w-5 text-slate-700" />}
                            >
                              <div className="space-y-3">
                                <SummaryLine
                                  label="Status do pedido"
                                  value={
                                    ORDER_STATUS_OPTIONS.find(
                                      (item) => item.value === selectedOrder.order_status
                                    )?.label || selectedOrder.order_status
                                  }
                                />
                                <SummaryLine
                                  label="Status da entrega"
                                  value={
                                    DELIVERY_STATUS_OPTIONS.find(
                                      (item) => item.value === selectedOrder.delivery_status
                                    )?.label || selectedOrder.delivery_status
                                  }
                                />
                                <SummaryLine
                                  label="Status do contrato"
                                  value={
                                    CONTRACT_STATUS_OPTIONS.find(
                                      (item) => item.value === selectedOrder.contract_status
                                    )?.label || selectedOrder.contract_status
                                  }
                                />
                                <SummaryLine
                                  label="Itens no pedido"
                                  value={String(selectedItems.length)}
                                />
                              </div>
                            </PanelCard>
                          </div>
                        </div>
                      ) : null}

                      {activeTab === "items" ? (
                        <PanelCard
                          title="Itens do pedido"
                          subtitle="Tudo o que o cliente selecionou no catálogo."
                          icon={<Package className="h-5 w-5 text-slate-700" />}
                        >
                          {selectedItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                              Nenhum item salvo neste pedido ainda.
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {selectedItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {item.product_name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {item.quantity}x • {formatCurrency(item.unit_price)} cada
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {formatCurrency(item.total_price)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </PanelCard>
                      ) : null}

                      {activeTab === "contract" ? (
                        <div className="space-y-5">
                          <PanelCard
                            title="Contrato digital"
                            subtitle="Controle do modelo, links, status e rascunho premium do contrato."
                            icon={<FileSignature className="h-5 w-5 text-slate-700" />}
                          >
                            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
                              <div className="space-y-3">
                                <Field
                                  label="Nome do modelo de contrato"
                                  value={selectedOrder.contract_model_name || ""}
                                  placeholder="Ex: Contrato de locação padrão 2026"
                                  onBlurSave={(value) =>
                                    updateOrderField(
                                      selectedOrder.id,
                                      { contract_model_name: value || null },
                                      "Modelo de contrato atualizado."
                                    )
                                  }
                                />
                                <Field
                                  label="Link do contrato / gov / PDF"
                                  value={selectedOrder.contract_link || ""}
                                  placeholder="Cole aqui o link do documento ou da assinatura"
                                  onBlurSave={(value) =>
                                    updateOrderField(
                                      selectedOrder.id,
                                      { contract_link: value || null },
                                      "Link do contrato atualizado."
                                    )
                                  }
                                />
                                <Field
                                  label="Arquivo assinado (URL)"
                                  value={selectedOrder.signed_contract_file_url || ""}
                                  placeholder="Cole aqui o link final do contrato assinado"
                                  onBlurSave={(value) =>
                                    updateOrderField(
                                      selectedOrder.id,
                                      { signed_contract_file_url: value || null },
                                      "Link do contrato assinado atualizado."
                                    )
                                  }
                                />
                              </div>

<div className="space-y-3">
  {selectedOrder.contract_link ? (
    <a
      href={selectedOrder.contract_link}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
    >
      <ExternalLink className="h-4 w-4" />
      Abrir contrato
    </a>
  ) : null}

  <button
    type="button"
    onClick={() => setSignatureModalOpen(true)}
    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
  >
    <Send className="h-4 w-4" />
    Enviar contrato
  </button>

  <button
    type="button"
    onClick={handlePrintContract}
    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
  >
    <Printer className="h-4 w-4" />
    Imprimir rascunho
  </button>

  <button
    type="button"
    onClick={handleDownloadContractHtml}
    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
  >
    <Download className="h-4 w-4" />
    Baixar HTML
  </button>

  <button
    type="button"
    onClick={() =>
      updateOrderField(
        selectedOrder.id,
        { contract_status: "signed", signed_on_gov: true },
        "Contrato marcado como assinado."
      )
    }
    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
  >
    <CheckCircle2 className="h-4 w-4" />
    Marcar como assinado
  </button>

  <SmallInfo
    label="Enviado em"
    value={formatDateTime(selectedOrder.contract_sent_at)}
  />
  <SmallInfo
    label="Assinado em"
    value={formatDateTime(selectedOrder.contract_signed_at)}
  />

  {signatureLinks.length > 0 ? (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Links gerados
      </p>

      <div className="mt-3 space-y-3">
        {signatureLinks.map((link) => (
          <div
            key={link.signer_id}
            className="rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {link.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{link.phone}</p>
              </div>

              <a
                href={link.whatsapp_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                value={link.signature_url}
                readOnly
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(link.signature_url);
                  setStatus({
                    type: "success",
                    message: `Link de ${link.name} copiado com sucesso.`,
                  });
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null}
</div>
                            </div>
                          </PanelCard>

                          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                            <PanelCard
                              title="Dados do locador"
                              subtitle="Informações puxadas da aba Empresa."
                              icon={<Building2 className="h-5 w-5 text-slate-700" />}
                            >
                              <div className="space-y-3">
                                <InfoLine
                                  icon={<Building2 className="h-4 w-4" />}
                                  label="Empresa"
                                  value={company?.name || "Minha empresa"}
                                />
                                <InfoLine
                                  icon={<FileText className="h-4 w-4" />}
                                  label="Documento"
                                  value={getCompanyDocument(company)}
                                />
                                <InfoLine
                                  icon={<Phone className="h-4 w-4" />}
                                  label="Telefone"
                                  value={getCompanyPhone(company)}
                                />
                                <InfoLine
                                  icon={<Mail className="h-4 w-4" />}
                                  label="E-mail"
                                  value={getCompanyEmail(company)}
                                />
                                <InfoLine
                                  icon={<MapPin className="h-4 w-4" />}
                                  label="Endereço"
                                  value={getCompanyAddress(company)}
                                />
                              </div>
                            </PanelCard>

                            <PanelCard
                              title="Rascunho do contrato"
                              subtitle="Prévia pronta para impressão e envio."
                              icon={<UserCircle2 className="h-5 w-5 text-slate-700" />}
                            >
                              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                                <div className="border-b border-slate-200 px-5 py-5">
                                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Locador
                                      </p>
                                      <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-950">
                                        {company?.name || "Minha empresa"}
                                      </h3>
                                      <div className="mt-3 space-y-1.5 text-sm leading-6 text-slate-600">
                                        <p>Documento: {getCompanyDocument(company)}</p>
                                        <p>Telefone: {getCompanyPhone(company)}</p>
                                        <p>E-mail: {getCompanyEmail(company)}</p>
                                        <p>Endereço: {getCompanyAddress(company)}</p>
                                      </div>
                                    </div>

                                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 lg:w-[260px]">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Pedido
                                      </p>
                                      <p className="mt-2 text-lg font-semibold text-slate-950">
                                        {selectedOrder.order_number}
                                      </p>
                                      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                                        <p>Evento: {formatDate(selectedOrder.event_date)}</p>
                                        <p>
                                          Recebimento:{" "}
                                          {selectedOrder.receive_mode === "delivery"
                                            ? "Entrega"
                                            : "Retirada"}
                                        </p>
                                        <p>Emissão: {formatLongDate(selectedOrder.created_at)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-b border-slate-200 px-5 py-5">
                                  <h4 className="text-center text-[28px] font-semibold tracking-[-0.04em] text-slate-950">
                                    {selectedOrder.contract_model_name || "Contrato de locação"}
                                  </h4>

                                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                                    <PreviewBox
                                      label="Cliente"
                                      value={selectedOrder.client_name || "—"}
                                    />
                                    <PreviewBox
                                      label="Telefone"
                                      value={selectedOrder.client_phone || "—"}
                                    />
                                    <PreviewBox
                                      label="Data do evento"
                                      value={formatDate(selectedOrder.event_date)}
                                    />
                                    <PreviewBox
                                      label="Recebimento"
                                      value={
                                        selectedOrder.receive_mode === "delivery"
                                          ? "Entrega"
                                          : "Retirada"
                                      }
                                    />
                                  </div>

                                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      Endereço / logística
                                    </p>
                                    <p className="mt-2 text-sm leading-7 text-slate-700">
                                      {selectedOrder.receive_mode === "delivery"
                                        ? buildAddressText(selectedAddress)
                                        : "Cliente fará retirada no local."}
                                    </p>
                                  </div>
                                </div>

                                <div className="border-b border-slate-200 px-5 py-5">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Itens do pedido
                                  </p>

                                  {selectedItems.length === 0 ? (
                                    <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                      Nenhum item lançado neste pedido ainda.
                                    </div>
                                  ) : (
                                    <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
                                      <div className="grid grid-cols-[90px_minmax(0,1fr)_150px_150px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        <span>Qtd.</span>
                                        <span>Produto</span>
                                        <span>Unitário</span>
                                        <span>Total</span>
                                      </div>

                                      <div className="divide-y divide-slate-200 bg-white">
                                        {selectedItems.map((item) => (
                                          <div
                                            key={item.id}
                                            className="grid grid-cols-[90px_minmax(0,1fr)_150px_150px] px-4 py-3 text-sm text-slate-700"
                                          >
                                            <span>{item.quantity}</span>
                                            <span className="truncate">{item.product_name}</span>
                                            <span>{formatCurrency(item.unit_price)}</span>
                                            <span className="font-semibold text-slate-900">
                                              {formatCurrency(item.total_price)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                                    <PreviewBox
                                      label="Subtotal"
                                      value={formatCurrency(selectedOrder.products_subtotal)}
                                    />
                                    <PreviewBox
                                      label="Frete"
                                      value={formatCurrency(selectedOrder.delivery_fee)}
                                    />
                                    <PreviewBox
                                      label="Custos extras"
                                      value={formatCurrency(selectedExtraCosts)}
                                    />
                                    <PreviewBox
                                      label="Total"
                                      value={formatCurrency(selectedOrder.total_amount)}
                                    />
                                  </div>
                                </div>

                                <div className="border-b border-slate-200 px-5 py-5">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Cláusulas contratuais
                                  </p>

                                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                                    <div className="space-y-3 text-sm leading-7 text-slate-700">
                                      {getContractClauses(selectedOrder).map((clause) => (
                                        <p key={clause}>{clause}</p>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="px-5 py-6">
                                  <p className="text-sm text-slate-600">
                                    {formatLongDate(selectedOrder.created_at)}
                                  </p>

                                  <div className="mt-8 grid gap-6 md:grid-cols-2">
                                    <div className="rounded-[22px] border border-slate-200 bg-white p-5 text-center">
                                      <div className="border-t border-slate-300 pt-4">
                                        <p className="font-semibold text-slate-900">
                                          {company?.name || "Minha empresa"}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-600">
                                          Documento: {getCompanyDocument(company)}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="rounded-[22px] border border-slate-200 bg-white p-5 text-center">
                                      <div className="border-t border-slate-300 pt-4">
                                        <p className="font-semibold text-slate-900">
                                          {selectedOrder.client_name || "Cliente"}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-600">
                                          Telefone: {selectedOrder.client_phone || "—"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </PanelCard>
                          </div>
                        </div>
                      ) : null}

                      {activeTab === "costs" ? (
                        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
                          <PanelCard
                            title="Adicionar custo"
                            subtitle="Registre compras ou despesas extras desse pedido."
                            icon={<Plus className="h-5 w-5 text-slate-700" />}
                          >
                            <form onSubmit={handleAddCost} className="space-y-3">
                              <Input
                                label="Descrição"
                                value={costForm.description}
                                onChange={(value) =>
                                  setCostForm((prev) => ({ ...prev, description: value }))
                                }
                                placeholder="Ex: Compra de balões extras"
                              />
                              <Input
                                label="Valor"
                                value={costForm.amount}
                                onChange={(value) =>
                                  setCostForm((prev) => ({ ...prev, amount: value }))
                                }
                                placeholder="Ex: 79.90"
                              />
                              <Input
                                label="Fornecedor"
                                value={costForm.supplier}
                                onChange={(value) =>
                                  setCostForm((prev) => ({ ...prev, supplier: value }))
                                }
                                placeholder="Ex: Loja das Festas"
                              />
                              <Input
                                label="Observação"
                                value={costForm.notes}
                                onChange={(value) =>
                                  setCostForm((prev) => ({ ...prev, notes: value }))
                                }
                                placeholder="Ex: item comprado só para este evento"
                              />

                              <button
                                type="submit"
                                disabled={savingId === selectedOrder.id}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingId === selectedOrder.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                                Adicionar custo
                              </button>
                            </form>
                          </PanelCard>

                          <PanelCard
                            title="Custos lançados"
                            subtitle="Histórico de tudo que foi gasto neste pedido."
                            icon={<ShoppingBag className="h-5 w-5 text-slate-700" />}
                          >
                            {(selectedOrder.decor_order_costs || []).length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                Você ainda não adicionou custos extras neste pedido.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(selectedOrder.decor_order_costs || []).map((cost) => (
                                  <div
                                    key={cost.id}
                                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {cost.description}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {cost.supplier || "Fornecedor não informado"}
                                        </p>
                                        {cost.notes ? (
                                          <p className="mt-2 text-xs leading-5 text-slate-500">
                                            {cost.notes}
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-900">
                                          {formatCurrency(cost.amount)}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                          {formatDateTime(cost.created_at)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </PanelCard>
                        </div>
                      ) : null}

                      {activeTab === "notes" ? (
                        <PanelCard
                          title="Observações internas"
                          subtitle="Anotações operacionais, alinhamentos e detalhes do andamento."
                          icon={<StickyNote className="h-5 w-5 text-slate-700" />}
                        >
                          <NotesEditor
                            value={selectedOrder.notes || ""}
                            onSave={(value) => handleSaveNotes(selectedOrder, value)}
                            saving={savingId === selectedOrder.id}
                          />
                        </PanelCard>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

                    {signatureModalOpen && selectedOrder ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-slate-950">
                  Enviar contrato para assinatura
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Defina quem vai assinar, quais evidências serão exigidas e gere os links para envio manual no WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              {signatureSigners.map((signer, index) => (
                <div
                  key={signer.id}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {signer.role === "client"
                          ? "Cliente principal"
                          : signer.role === "internal"
                            ? "Equipe interna"
                            : `Assinante adicional ${index + 1}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Configure os dados e as evidências exigidas para este assinante.
                      </p>
                    </div>

                    {signer.role === "extra" ? (
                      <button
                        type="button"
                        onClick={() => removeSignerDraft(signer.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700"
                      >
                        <X className="h-4 w-4" />
                        Remover
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Input
                      label="Nome"
                      value={signer.name}
                      onChange={(value) => updateSignerDraft(signer.id, { name: value })}
                      placeholder="Nome do assinante"
                    />

                    <Input
                      label="WhatsApp"
                      value={signer.phone}
                      onChange={(value) => updateSignerDraft(signer.id, { phone: value })}
                      placeholder="62999999999"
                    />

                    <Input
                      label="E-mail"
                      value={signer.email || ""}
                      onChange={(value) => updateSignerDraft(signer.id, { email: value })}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateSignerDraft(signer.id, {
                          require_selfie: !signer.require_selfie,
                        })
                      }
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        signer.require_selfie
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <Camera className="h-4 w-4" />
                      Exigir selfie
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateSignerDraft(signer.id, {
                          require_document_front: !signer.require_document_front,
                        })
                      }
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        signer.require_document_front
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <IdCard className="h-4 w-4" />
                      Frente do documento
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateSignerDraft(signer.id, {
                          require_document_back: !signer.require_document_back,
                        })
                      }
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        signer.require_document_back
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <IdCard className="h-4 w-4" />
                      Verso do documento
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addExtraSigner}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar assinante
              </button>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateSignatureRequest}
                disabled={creatingSignature}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingSignature ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Gerar links de assinatura
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

function SelectCard({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <div className="mt-2">
        <Select value={value} onChange={onChange} options={options} />
      </div>
      {disabled ? (
        <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvando...
        </div>
      ) : null}
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
      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function Field({
  label,
  value,
  placeholder,
  onBlurSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onBlurSave: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onBlurSave(localValue.trim())}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function NotesEditor({
  value,
  onSave,
  saving,
}: {
  value: string;
  onSave: (value: string) => void;
  saving?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div>
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        rows={7}
        placeholder="Ex: cliente pediu ajuste no tema, entrega no período da manhã, falta confirmar assinatura..."
        className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          As observações são salvas por pedido.
        </p>
        <button
          type="button"
          onClick={() => onSave(localValue.trim())}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Salvar observações
        </button>
      </div>
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-400">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </p>
    </div>
  );
}