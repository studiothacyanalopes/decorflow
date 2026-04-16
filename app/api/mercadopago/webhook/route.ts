import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DecorPlanId = "start" | "pro" | "enterprise";

function isValidUuid(value?: string | null) {
  if (!value || typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function headersToObject(headers: Headers) {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeEventType(value?: string | null) {
  if (!value) return null;
  return value.toLowerCase().trim();
}

function normalizePlanId(value?: unknown): DecorPlanId {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "start" ||
    normalized === "pro" ||
    normalized === "enterprise"
  ) {
    return normalized;
  }

  return "start";
}

function resolveSubscriptionContext(params: {
  metadata?: Record<string, unknown>;
  externalReference?: string | null;
}) {
  const { metadata, externalReference } = params;

  const companyId =
    (metadata?.company_id as string | undefined) ||
    (metadata?.companyId as string | undefined) ||
    externalReference ||
    null;

  const planId = normalizePlanId(metadata?.plan_id);
  const planLabel =
    (metadata?.plan_label as string | undefined) ||
    (planId === "enterprise"
      ? "Enterprise"
      : planId === "pro"
        ? "Pro"
        : "Start");

  const amount = Number(metadata?.amount || 0);
  const billingCycle =
    (metadata?.billing_cycle as string | undefined) || "monthly";

  return {
    companyId,
    planId,
    planLabel,
    amount,
    billingCycle,
  };
}

async function getMercadoPagoPayment(paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.cause?.[0]?.description ||
        "Erro ao consultar pagamento no Mercado Pago"
    );
  }

  return data;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  return NextResponse.json({
    ok: true,
    route: "decorflow_mercadopago_webhook",
    query: Object.fromEntries(url.searchParams.entries()),
  });
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const headers = headersToObject(request.headers);

    let rawBody = "";
    try {
      rawBody = await request.text();
    } catch (error) {
      console.error("[decorflow/webhook] erro ao ler raw body:", error);
    }

    let payload: any = null;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = null;
    }

    console.log("[decorflow/webhook] headers:", headers);
    console.log("[decorflow/webhook] query:", searchParams);
    console.log("[decorflow/webhook] payload:", payload);

    if (!mpAccessToken) {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "missing_access_token",
      });
    }

    const eventType = normalizeEventType(
      payload?.type ||
        payload?.action ||
        payload?.topic ||
        searchParams?.type ||
        searchParams?.topic ||
        null
    );

    let paymentId: string | null =
      payload?.data?.id?.toString?.() ||
      payload?.id?.toString?.() ||
      searchParams["data.id"] ||
      searchParams["id"] ||
      null;

    const resource = payload?.resource || searchParams?.resource || null;

    if (!paymentId && typeof resource === "string") {
      const parts = resource.split("/");
      paymentId = parts[parts.length - 1] || null;
    }

    const acceptedEvents = new Set([
      "payment",
      "payment.updated",
      "payment.created",
    ]);

    if (eventType && !acceptedEvents.has(eventType)) {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "unsupported_event",
        eventType,
      });
    }

    if (!paymentId) {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "no_payment_id",
      });
    }

    let paymentData: any = null;

    try {
      paymentData = await getMercadoPagoPayment(paymentId);
    } catch (error) {
      console.error("[decorflow/webhook] erro ao consultar payment:", error);

      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "payment_lookup_failed",
        paymentId,
      });
    }

    const paymentStatus = paymentData?.status || null;
    const externalReference = paymentData?.external_reference || null;
    const metadata = (paymentData?.metadata || {}) as Record<string, unknown>;

    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "missing_supabase_envs",
        paymentId,
      });
    }

    if (paymentStatus !== "approved") {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        updated: false,
        paymentStatus,
      });
    }

    const { companyId, planId, planLabel, amount, billingCycle } =
      resolveSubscriptionContext({
        metadata,
        externalReference,
      });

    if (!companyId || !isValidUuid(companyId)) {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "invalid_subscription_company_id",
        paymentId,
        companyId,
        externalReference,
      });
    }

    const { data: companyBefore, error: companyLookupError } = await supabaseAdmin
      .from("companies")
      .select("id, plan, plan_status")
      .eq("id", companyId)
      .maybeSingle();

    if (companyLookupError) {
      console.error("[decorflow/webhook] erro ao buscar empresa:", companyLookupError);

      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "company_lookup_failed",
        companyId,
        paymentId,
      });
    }

    if (!companyBefore) {
      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "company_not_found",
        companyId,
        paymentId,
      });
    }

    const approvedAtRaw =
      paymentData?.date_approved || new Date().toISOString();

    const approvedAt = new Date(approvedAtRaw);
    const finalApprovedAt = isValidDate(approvedAt) ? approvedAt : new Date();

    const cycleEndsAt = addDays(finalApprovedAt, 30);
    const graceEndsAt = addDays(finalApprovedAt, 35);

    const isAlreadyPaidPlan = ["start", "pro", "enterprise"].includes(
      String(companyBefore.plan || "").toLowerCase()
    );

    const updatePayload: Record<string, any> = {
      plan: planId,
      plan_status: "active",
      billing_status: "active",
      trial_ends_at: null,
      last_payment_at: finalApprovedAt.toISOString(),
      billing_last_event_at: finalApprovedAt.toISOString(),
      billing_cycle_ends_at: cycleEndsAt.toISOString(),
      billing_grace_ends_at: graceEndsAt.toISOString(),
    };

    if (!isAlreadyPaidPlan || companyBefore?.plan_status === "blocked") {
      updatePayload.billing_started_at = finalApprovedAt.toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updatePayload)
      .eq("id", companyId);

    if (updateError) {
      console.error("[decorflow/webhook] erro ao atualizar empresa:", updateError);

      return NextResponse.json({
        ok: true,
        acknowledged: true,
        ignored: true,
        reason: "company_update_failed",
        companyId,
        paymentId,
        paymentStatus,
      });
    }

    return NextResponse.json({
      ok: true,
      acknowledged: true,
      updated: true,
      paymentId,
      paymentStatus,
      companyId,
      planId,
      planLabel,
      amount,
      billingCycle,
      billing_started_at: updatePayload.billing_started_at ?? null,
      billing_cycle_ends_at: cycleEndsAt.toISOString(),
      billing_grace_ends_at: graceEndsAt.toISOString(),
    });
  } catch (error) {
    console.error("[decorflow/webhook] erro geral:", error);

    return NextResponse.json({
      ok: true,
      acknowledged: true,
      ignored: true,
      reason: "unexpected_exception",
      error:
        error instanceof Error ? error.message : "Erro interno inesperado",
    });
  }
}