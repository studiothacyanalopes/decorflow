"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const CHECKOUT_API_ROUTE = "/api/mercadopago/create-checkout";
const CONFIRM_PAYMENT_API_ROUTE = "/api/mercadopago/confirm-payment";

type CompanyContext = {
  id: string;
  name: string;
  plan?: string | null;
  plan_status?: string | null;
  billing_status?: string | null;
  billing_cycle_ends_at?: string | null;
  trial_ends_at?: string | null;
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

type PlanFeature = {
  label: string;
  included: boolean;
  helper?: string;
};

type PlanConfig = {
  id: "start" | "pro" | "enterprise";
  name: string;
  price: number;
  description: string;
  badge?: string;
  highlight?: boolean;
  limits: {
    products: string;
    clients: string;
    teamMembers: string;
    simultaneousAccess: string;
  };
  features: PlanFeature[];
};

const PLANS: PlanConfig[] = [
  {
    id: "start",
    name: "Start",
    price: 99.9,
    description:
      "Plano ideal para começar a operar com catálogo, pedidos, financeiro e equipe no DecorFlow.",
    limits: {
      products: "3.000",
      clients: "ilimitado",
      teamMembers: "6",
      simultaneousAccess: "6",
    },
    features: [
      { label: "Catálogo público", included: true },
      { label: "Pedidos e fluxo operacional", included: true },
      { label: "Clientes", included: true },
      { label: "Produtos", included: true },
      { label: "Financeiro", included: true },
      { label: "Relatórios", included: true },
      { label: "Equipe", included: true },
      { label: "Empresa", included: true },
      { label: "Contrato padrão", included: true },
      { label: "Permissões por membro", included: true },
      { label: "Website", included: false },
      { label: "Assinatura digital avançada", included: false },
      {
        label: "Link de pagamento avançado",
        included: false,
        helper: "",
      },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 179.9,
    description:
      "Para empresas com operação mais forte, mais equipe e mais volume de produtos e pedidos.",
    badge: "Mais escolhido",
    highlight: true,
    limits: {
      products: "8.000",
      clients: "ilimitado",
      teamMembers: "15",
      simultaneousAccess: "15",
    },
    features: [
      { label: "Catálogo público", included: true },
      { label: "Pedidos e fluxo operacional", included: true },
      { label: "Clientes", included: true },
      { label: "Produtos", included: true },
      { label: "Financeiro", included: true },
      { label: "Relatórios", included: true },
      { label: "Equipe", included: true },
      { label: "Empresa", included: true },
      { label: "Contrato padrão", included: true },
      { label: "Permissões por membro", included: true },
      { label: "Mais membros de equipe", included: true },
      { label: "Website", included: false },
      { label: "Assinatura digital avançada", included: false },
      {
        label: "Link de pagamento avançado",
        included: true,
        helper: "",
      },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 329.9,
    description:
      "Para operações maiores, com mais equipe, mais produtos e escala comercial mais forte.",
    limits: {
      products: "20.000",
      clients: "ilimitado",
      teamMembers: "ilimitado",
      simultaneousAccess: "ilimitado",
    },
    features: [
      { label: "Catálogo público", included: true },
      { label: "Pedidos e fluxo operacional", included: true },
      { label: "Clientes", included: true },
      { label: "Produtos", included: true },
      { label: "Financeiro", included: true },
      { label: "Relatórios", included: true },
      { label: "Equipe", included: true },
      { label: "Empresa", included: true },
      { label: "Contrato padrão", included: true },
      { label: "Permissões por membro", included: true },
      { label: "Escala de equipe ilimitada", included: true },
      { label: "Website", included: true },
      { label: "Assinatura digital avançada", included: true },
      { label: "Link de pagamento avançado", included: true },
    ],
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

function getPlanLabel(plan?: string | null) {
  if (!plan) return "Sem plano";
  const found = PLANS.find((item) => item.id === plan);
  return found?.name || plan;
}

function getPaymentParams() {
  if (typeof window === "undefined") {
    return {
      paymentStatus: null,
      paymentId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  const paymentStatus =
    params.get("payment") ||
    params.get("status") ||
    params.get("collection_status") ||
    null;

  const paymentId =
    params.get("payment_id") ||
    params.get("collection_id") ||
    params.get("paymentId") ||
    null;

  return {
    paymentStatus,
    paymentId,
  };
}

function cleanPaymentQueryParams() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);

  [
    "payment",
    "status",
    "payment_id",
    "collection_id",
    "collection_status",
    "merchant_order_id",
    "preference_id",
    "external_reference",
    "site_id",
    "processing_mode",
    "merchant_account_id",
    "paymentId",
  ].forEach((key) => {
    url.searchParams.delete(key);
  });

  window.history.replaceState({}, "", url.toString());
}

export default function DecorAssinaturaPage() {
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  const handledPaymentRef = useRef(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  useEffect(() => {
    if (!loading) {
      void handlePaymentReturn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function loadSubscriptionData(options?: { silent?: boolean }) {
    try {
      if (!options?.silent) {
        setLoading(true);
      }

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

      setCompany({
        id: companyData?.id,
        name: companyData?.name || "Minha empresa",
        plan: companyData?.plan || null,
        plan_status: companyData?.plan_status || null,
        billing_status: companyData?.billing_status || null,
        billing_cycle_ends_at: companyData?.billing_cycle_ends_at || null,
        trial_ends_at: companyData?.trial_ends_at || null,
      });
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar a assinatura.",
      });
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  async function handlePaymentReturn() {
    if (handledPaymentRef.current) return;

    const { paymentStatus, paymentId } = getPaymentParams();

    if (!paymentStatus) return;

    handledPaymentRef.current = true;

    if (paymentStatus === "pending") {
      setStatus({
        type: "success",
        message:
          "Seu pagamento está pendente. Assim que o Mercado Pago confirmar, sua assinatura será atualizada automaticamente.",
      });
      cleanPaymentQueryParams();
      return;
    }

    if (paymentStatus === "failure") {
      setStatus({
        type: "error",
        message:
          "O pagamento não foi concluído. Você pode tentar novamente quando quiser.",
      });
      cleanPaymentQueryParams();
      return;
    }

    if (paymentStatus !== "success") {
      return;
    }

    if (!paymentId) {
      setStatus({
        type: "error",
        message:
          "O pagamento voltou como sucesso, mas o identificador do pagamento não foi encontrado na URL.",
      });
      cleanPaymentQueryParams();
      return;
    }

    try {
      setConfirmingPayment(true);
      setStatus({
        type: "success",
        message: "Pagamento recebido. Confirmando assinatura...",
      });

      const response = await fetch(CONFIRM_PAYMENT_API_ROUTE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setStatus({
          type: "error",
          message:
            data?.error ||
            "Não foi possível confirmar o pagamento da assinatura.",
        });
        cleanPaymentQueryParams();
        return;
      }

      if (data?.updated) {
        await loadSubscriptionData({ silent: true });

        const paidPlanLabel =
          PLANS.find((item) => item.id === data?.planId)?.name ||
          data?.planLabel ||
          "plano contratado";

        setStatus({
          type: "success",
          message: `Pagamento confirmado com sucesso. Seu plano ${paidPlanLabel} já foi ativado no DecorFlow.`,
        });
      } else {
        setStatus({
          type: "success",
          message:
            "Recebemos o retorno do pagamento, mas ele ainda não consta como aprovado no Mercado Pago.",
        });
      }

      cleanPaymentQueryParams();
    } catch {
      setStatus({
        type: "error",
        message:
          "Ocorreu um erro inesperado ao confirmar o pagamento da assinatura.",
      });
      cleanPaymentQueryParams();
    } finally {
      setConfirmingPayment(false);
    }
  }

  async function handleStartCheckout(plan: PlanConfig) {
    if (!company?.id) return;

    try {
      setStartingCheckout(plan.id);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch(CHECKOUT_API_ROUTE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkout_type: "subscription",
          company_id: company.id,
          company_name: company.name,
          system_name: "DecorFlow",
          user_email: user?.email || "",
          plan_id: plan.id,
          plan_label: plan.name,
          amount: plan.price,
          billing_cycle: "monthly",
          source: "decorflow_assinatura",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus({
          type: "error",
          message:
            data?.error ||
            "Não foi possível iniciar o checkout. Verifique a rota do Mercado Pago.",
        });
        return;
      }

      const checkoutUrl =
        data?.init_point ||
        data?.checkout_url ||
        data?.sandbox_init_point ||
        data?.initPoint ||
        data?.sandboxInitPoint ||
        null;

      if (!checkoutUrl) {
        setStatus({
          type: "error",
          message:
            "O checkout foi iniciado, mas a URL de pagamento não foi retornada.",
        });
        return;
      }

      window.location.href = checkoutUrl;
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao iniciar o checkout.",
      });
    } finally {
      setStartingCheckout(null);
    }
  }

  const currentPlan = useMemo(() => {
    return PLANS.find((item) => item.id === company?.plan) || null;
  }, [company?.plan]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando assinatura...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1700px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  DecorFlow
                </div>

                <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Meu plano
                </h1>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                  Escolha o plano ideal para a sua operação e ative a assinatura
                  mensal pelo Mercado Pago.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Empresa</p>
                <p>{company?.name || "Minha empresa"}</p>
              </div>
            </div>

            {confirmingPayment ? (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                <span>Confirmando pagamento no Mercado Pago...</span>
              </div>
            ) : null}

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
          </div>

          <div className="grid gap-0 xl:grid-cols-[390px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50/70 xl:border-b-0 xl:border-r">
              <div className="p-4 sm:p-5">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-700" />
                    <h2 className="text-base font-semibold text-slate-950">
                      Plano atual
                    </h2>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Plano
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {getPlanLabel(company?.plan)}
                    </p>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Status do plano
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {company?.plan_status || "—"}
                    </p>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Status da cobrança
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {company?.billing_status || "—"}
                    </p>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Próximo ciclo / vencimento
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(company?.billing_cycle_ends_at)}
                    </p>
                  </div>

                  <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Trial até
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(company?.trial_ends_at)}
                    </p>
                  </div>

                  {currentPlan ? (
                    <div className="mt-5 rounded-[22px] border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-700" />
                        <p className="text-sm font-semibold text-blue-900">
                          Resumo do seu plano
                        </p>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-blue-900">
                        <InfoRow
                          label="Produtos"
                          value={currentPlan.limits.products}
                        />
                        <InfoRow
                          label="Clientes"
                          value={currentPlan.limits.clients}
                        />
                        <InfoRow
                          label="Equipe"
                          value={currentPlan.limits.teamMembers}
                        />
                        <InfoRow
                          label="Acesso simultâneo"
                          value={currentPlan.limits.simultaneousAccess}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>

            <section className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-slate-700" />
                  <h2 className="text-base font-semibold text-slate-950">
                    Selecione o plano que deseja
                  </h2>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {PLANS.map((plan) => {
                    const isCurrent = company?.plan === plan.id;
                    const isBusy =
                      startingCheckout === plan.id || confirmingPayment;

                    return (
                      <div
                        key={plan.id}
                        className={`relative flex flex-col rounded-[26px] border p-5 shadow-sm transition ${
                          plan.highlight
                            ? "border-blue-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        {plan.badge ? (
                          <div className="absolute right-4 top-4 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            {plan.badge}
                          </div>
                        ) : null}

                        {isCurrent ? (
                          <div className="absolute left-4 top-4 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Plano atual
                          </div>
                        ) : null}

                        <div className="pt-6">
                          <h3 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-950">
                            {plan.name}
                          </h3>

                          <div className="mt-4">
                            <p className="text-[38px] font-semibold tracking-[-0.05em] text-[#4f46e5]">
                              {formatCurrency(plan.price)}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              por mês
                            </p>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-slate-500">
                            {plan.description}
                          </p>
                        </div>

                        <div className="mt-6 space-y-3 text-sm">
                          <PlanLimitRow
                            label="Produtos"
                            value={plan.limits.products}
                          />
                          <PlanLimitRow
                            label="Cadastro de clientes"
                            value={plan.limits.clients}
                          />
                          <PlanLimitRow
                            label="Membros de equipe"
                            value={plan.limits.teamMembers}
                          />
                          <PlanLimitRow
                            label="Acesso simultâneo"
                            value={plan.limits.simultaneousAccess}
                          />
                        </div>

                        <div className="mt-6 space-y-2 border-t border-slate-200 pt-5">
                          {plan.features.map((feature) => (
                            <FeatureRow
                              key={feature.label}
                              label={feature.label}
                              included={feature.included}
                              helper={feature.helper}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartCheckout(plan)}
                          disabled={isBusy}
                          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {startingCheckout === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {isCurrent ? "Renovar / alterar plano" : "Assinar agora"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-5 text-xs text-slate-400">
                  DecorFlow - Soluções Digitais
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function PlanLimitRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function FeatureRow({
  label,
  included,
  helper,
}: {
  label: string;
  included: boolean;
  helper?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-700">{label}</p>
        {helper ? (
          <p className="mt-0.5 text-[11px] text-slate-400">{helper}</p>
        ) : null}
      </div>

      <div className="shrink-0">
        {included ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <X className="h-4 w-4 text-rose-500" />
        )}
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}