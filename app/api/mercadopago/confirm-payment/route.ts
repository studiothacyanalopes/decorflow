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

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase envs não configuradas no servidor.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

export async function POST(request: NextRequest) {
  try {
    if (!mpAccessToken) {
      return NextResponse.json(
        { ok: false, error: "MERCADO_PAGO_ACCESS_TOKEN ausente" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const paymentId = body?.paymentId?.toString?.() || null;

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "paymentId é obrigatório" },
        { status: 400 }
      );
    }

    const paymentData = await getMercadoPagoPayment(paymentId);

    const paymentStatus = paymentData?.status || null;
    const externalReference = paymentData?.external_reference || null;
    const metadata = (paymentData?.metadata || {}) as Record<string, unknown>;

    if (paymentStatus !== "approved") {
      return NextResponse.json({
        ok: true,
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
      return NextResponse.json(
        {
          ok: false,
          error: "Metadados inválidos para assinatura",
          companyId,
          externalReference,
        },
        { status: 400 }
      );
    }

    const approvedAtRaw =
      paymentData?.date_approved || new Date().toISOString();

    const approvedAt = new Date(approvedAtRaw);
    const finalApprovedAt = isValidDate(approvedAt) ? approvedAt : new Date();

    const cycleEndsAt = addDays(finalApprovedAt, 30);
    const graceEndsAt = addDays(finalApprovedAt, 35);

    const supabaseAdmin = getSupabaseAdmin();

    const { data: companyBefore, error: companyLookupError } = await supabaseAdmin
      .from("companies")
      .select("id, plan, plan_status")
      .eq("id", companyId)
      .maybeSingle();

    if (companyLookupError) {
      throw companyLookupError;
    }

    if (!companyBefore) {
      return NextResponse.json(
        {
          ok: false,
          error: "Empresa não encontrada para assinatura",
          companyId,
        },
        { status: 404 }
      );
    }

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
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      updated: true,
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
    console.error("[decorflow/confirm-payment] erro:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao confirmar pagamento",
      },
      { status: 500 }
    );
  }
}