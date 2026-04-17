import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

if (!mpAccessToken) {
  throw new Error("MERCADO_PAGO_ACCESS_TOKEN ausente");
}

const mp = new MercadoPagoConfig({
  accessToken: mpAccessToken,
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DecorPlanId = "start" | "pro" | "enterprise";

type CreateCheckoutBody = {
  checkoutType?: "subscription";
  checkout_type?: "subscription";
  companyId?: string;
  company_id?: string;
  companyName?: string;
  company_name?: string;
  systemName?: string;
  system_name?: string;
  userEmail?: string;
  user_email?: string;
  planId?: DecorPlanId;
  plan_id?: DecorPlanId;
  planLabel?: string;
  plan_label?: string;
  amount?: number | string;
  billingCycle?: string;
  billing_cycle?: string;
  source?: string;
};

function isValidUuid(value?: string | null) {
  if (!value || typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function normalizePlanId(value?: string | null): DecorPlanId | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "start" ||
    normalized === "pro" ||
    normalized === "enterprise"
  ) {
    return normalized;
  }

  return null;
}

function getDecorPlanConfig(planId: DecorPlanId) {
  const plans = {
    start: {
      label: "Start",
      amount: 99.9,
    },
    pro: {
      label: "Pro",
      amount: 179.9,
    },
    enterprise: {
      label: "Enterprise",
      amount: 329.9,
    },
  } as const;

  return plans[planId];
}

function normalizeBaseUrl(raw?: string | null) {
  if (!raw) return null;

  const cleaned = raw.trim().replace(/\/$/, "");

  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch {
    return null;
  }
}

function getBaseUrl(request: NextRequest) {
  const envBaseUrl =
    normalizeBaseUrl(process.env.APP_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (envBaseUrl) return envBaseUrl;

  const requestUrl = new URL(request.url);
  return requestUrl.origin.replace(/\/$/, "");
}

function isLocalhostUrl(url: string) {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCheckoutBody;

    const checkoutType =
      body.checkoutType || body.checkout_type || "subscription";

    const companyId = body.companyId || body.company_id;
    const companyName = body.companyName || body.company_name || "Empresa";
    const systemName = body.systemName || body.system_name || "DecorFlow";
    const userEmail = body.userEmail || body.user_email || "";
    const billingCycle = body.billingCycle || body.billing_cycle || "monthly";
    const source = body.source || "decorflow_assinatura";

    const planId = normalizePlanId(body.planId || body.plan_id);
    const bodyAmount = toPositiveNumber(body.amount);

    if (checkoutType !== "subscription") {
      return NextResponse.json(
        { ok: false, error: "checkout_type inválido para esta rota." },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "company_id é obrigatório." },
        { status: 400 }
      );
    }

    if (!isValidUuid(companyId)) {
      return NextResponse.json(
        { ok: false, error: "company_id inválido." },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        {
          ok: false,
          error: "plan_id inválido. Use start, pro ou enterprise.",
        },
        { status: 400 }
      );
    }

    const planConfig = getDecorPlanConfig(planId);
    const finalAmount = bodyAmount > 0 ? bodyAmount : planConfig.amount;
    const finalPlanLabel =
      body.planLabel || body.plan_label || planConfig.label;

    if (finalAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "amount inválido." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(request);

    const successUrl = `${baseUrl}/painel/assinatura?payment=success`;
    const pendingUrl = `${baseUrl}/painel/assinatura?payment=pending`;
    const failureUrl = `${baseUrl}/painel/assinatura?payment=failure`;
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`;

    const isLocal = isLocalhostUrl(baseUrl);

    const preference = new Preference(mp);

    const preferenceBody: any = {
      items: [
        {
          id: `decorflow-${planId}`,
          title: `${systemName} ${finalPlanLabel}`,
          description: `Assinatura mensal ${systemName} - plano ${finalPlanLabel}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: finalAmount,
        },
      ],
      payer: userEmail ? { email: userEmail } : undefined,
      back_urls: {
        success: successUrl,
        pending: pendingUrl,
        failure: failureUrl,
      },
      external_reference: companyId,
      metadata: {
        checkout_type: "subscription",
        system_name: systemName,
        source,
        company_id: companyId,
        company_name: companyName,
        plan_id: planId,
        plan_label: finalPlanLabel,
        amount: finalAmount,
        billing_cycle: billingCycle,
      },
      notification_url: webhookUrl,
      statement_descriptor: "DECORFLOW",
    };

    if (!isLocal) {
      preferenceBody.auto_return = "approved";
    }

    console.log("[decorflow/create-checkout] baseUrl:", baseUrl);
    console.log("[decorflow/create-checkout] preferenceBody:", preferenceBody);

    const result = await preference.create({
      body: preferenceBody as any,
    });

    return NextResponse.json({
      ok: true,
      id: result.id ?? null,
      preferenceId: result.id ?? null,
      init_point: result.init_point ?? null,
      sandbox_init_point: result.sandbox_init_point ?? null,
      checkout_url: result.init_point ?? result.sandbox_init_point ?? null,
      baseUrl,
      usedAutoReturn: !isLocal,
    });
  } catch (error) {
    console.error("[decorflow/create-checkout] erro:", error);

    const message =
      error instanceof Error ? error.message : "Erro interno ao criar checkout";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}