import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignerInput = {
  role: "client" | "internal" | "extra";
  name: string;
  phone: string;
  phone_country_code?: string;
  email?: string | null;
  require_selfie?: boolean;
  require_document_front?: boolean;
  require_document_back?: boolean;
};

type BodyInput = {
  company_id: string;
  order_id: string;
  contract_title: string;
  contract_html: string;
  signers: SignerInput[];
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server envs ausentes.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(req.url).origin;

  return envUrl.replace(/\/$/, "");
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function buildWhatsappUrl(phone: string, text: string) {
  const clean = normalizePhone(phone);
  const full = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Erro desconhecido");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyInput;

    console.log("[create-signature-request] body recebido:", {
      company_id: body?.company_id,
      order_id: body?.order_id,
      contract_title: body?.contract_title,
      signers_count: body?.signers?.length || 0,
    });

    if (!body.company_id || !body.order_id || !body.contract_html) {
      return NextResponse.json(
        {
          ok: false,
          step: "validate_body",
          error: "Dados obrigatórios ausentes.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.signers) || body.signers.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          step: "validate_signers",
          error: "Nenhum assinante informado.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const baseUrl = getBaseUrl(req);
    const contractHash = crypto
      .createHash("sha256")
      .update(body.contract_html)
      .digest("hex");

    console.log("[create-signature-request] iniciando criação da request...");

    const { data: requestRow, error: requestError } = await supabase
      .from("decor_signature_requests")
      .insert({
        company_id: body.company_id,
        order_id: body.order_id,
        contract_title: body.contract_title || "Contrato de locação",
        contract_html: body.contract_html,
        contract_hash: contractHash,
        created_by: null,
        status: "pending",
        sent_at: new Date().toISOString(),
        metadata: {},
      })
      .select("*")
      .single();

    if (requestError || !requestRow) {
      console.error("[create-signature-request] erro ao criar request:", requestError);

      return NextResponse.json(
        {
          ok: false,
          step: "insert_request",
          error:
            requestError?.message || "Erro ao criar solicitação de assinatura.",
          details: requestError,
        },
        { status: 500 }
      );
    }

    console.log("[create-signature-request] request criada:", requestRow.id);

    const signerRows = body.signers.map((signer) => ({
      request_id: requestRow.id,
      company_id: body.company_id,
      order_id: body.order_id,
      role: signer.role,
      name: signer.name,
      phone: normalizePhone(signer.phone),
      phone_country_code: signer.phone_country_code || "+55",
      email: signer.email || null,
      require_selfie: !!signer.require_selfie,
      require_document_front: !!signer.require_document_front,
      require_document_back: !!signer.require_document_back,
      unique_token: crypto.randomUUID(),
      status: "pending",
    }));

    console.log(
      "[create-signature-request] iniciando criação dos signers...",
      signerRows.map((s) => ({
        role: s.role,
        name: s.name,
        phone: s.phone,
        unique_token: s.unique_token,
      }))
    );

    const { data: createdSigners, error: signerError } = await supabase
      .from("decor_signature_signers")
      .insert(signerRows)
      .select("*");

    if (signerError || !createdSigners) {
      console.error("[create-signature-request] erro ao criar signers:", signerError);

      return NextResponse.json(
        {
          ok: false,
          step: "insert_signers",
          error: signerError?.message || "Erro ao criar assinantes.",
          details: signerError,
        },
        { status: 500 }
      );
    }

    console.log(
      "[create-signature-request] signers criados:",
      createdSigners.map((s) => ({ id: s.id, token: s.unique_token }))
    );

    const links = createdSigners.map((signer) => {
      const signatureUrl = `${baseUrl}/assinatura/${signer.unique_token}`;
      const message = [
        `Olá, ${signer.name}!`,
        ``,
        `Seu contrato está pronto para assinatura digital.`,
        `Pedido: ${body.order_id}`,
        `Acesse o link abaixo para visualizar e assinar:`,
        signatureUrl,
      ].join("\n");

      return {
        signer_id: signer.id,
        role: signer.role,
        name: signer.name,
        phone: signer.phone,
        token: signer.unique_token,
        signature_url: signatureUrl,
        whatsapp_url: buildWhatsappUrl(signer.phone, message),
      };
    });

    console.log("[create-signature-request] iniciando criação dos eventos...");

    const { error: eventsError } = await supabase
      .from("decor_signature_events")
      .insert([
        {
          company_id: body.company_id,
          order_id: body.order_id,
          request_id: requestRow.id,
          event_type: "created",
          description: "Solicitação de assinatura criada.",
          payload: {
            signers_count: createdSigners.length,
          },
        },
        {
          company_id: body.company_id,
          order_id: body.order_id,
          request_id: requestRow.id,
          event_type: "sent",
          description: "Links de assinatura gerados.",
          payload: {
            signers_count: createdSigners.length,
          },
        },
      ]);

    if (eventsError) {
      console.error("[create-signature-request] erro ao criar eventos:", eventsError);

      return NextResponse.json(
        {
          ok: false,
          step: "insert_events",
          error: eventsError.message || "Erro ao registrar eventos.",
          details: eventsError,
        },
        { status: 500 }
      );
    }

    console.log("[create-signature-request] atualizando decor_orders...");

    const { error: orderUpdateError } = await supabase
      .from("decor_orders")
      .update({
        contract_status: "sent",
        contract_sent_at: new Date().toISOString(),
        contract_link: links[0]?.signature_url || null,
      })
      .eq("id", body.order_id);

    if (orderUpdateError) {
      console.error(
        "[create-signature-request] erro ao atualizar decor_orders:",
        orderUpdateError
      );

      return NextResponse.json(
        {
          ok: false,
          step: "update_order",
          error:
            orderUpdateError.message || "Erro ao atualizar status do pedido.",
          details: orderUpdateError,
        },
        { status: 500 }
      );
    }

    console.log("[create-signature-request] finalizado com sucesso.");

    return NextResponse.json({
      ok: true,
      request_id: requestRow.id,
      links,
    });
  } catch (error) {
    console.error("[create-signature-request] erro fatal:", error);

    return NextResponse.json(
      {
        ok: false,
        step: "catch",
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}