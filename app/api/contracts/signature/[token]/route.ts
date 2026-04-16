import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: signer, error: signerError } = await supabase
      .from("decor_signature_signers")
      .select("*")
      .eq("unique_token", token)
      .single();

    if (signerError || !signer) {
      return NextResponse.json(
        { ok: false, error: "Link de assinatura não encontrado." },
        { status: 404 }
      );
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("decor_signature_requests")
      .select("*")
      .eq("id", signer.request_id)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json(
        { ok: false, error: "Solicitação não encontrada." },
        { status: 404 }
      );
    }

    if (!signer.viewed_at) {
      await supabase
        .from("decor_signature_signers")
        .update({
          status: signer.status === "pending" ? "viewed" : signer.status,
          viewed_at: new Date().toISOString(),
        })
        .eq("id", signer.id);

      await supabase.from("decor_signature_events").insert({
        company_id: signer.company_id,
        order_id: signer.order_id,
        request_id: signer.request_id,
        signer_id: signer.id,
        event_type: "viewed",
        description: "Link de assinatura visualizado.",
        payload: {},
      });

      await supabase
        .from("decor_orders")
        .update({
          contract_status: "viewed",
        })
        .eq("id", signer.order_id);
    }

    return NextResponse.json({
      ok: true,
      signer,
      request: requestRow,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno.",
      },
      { status: 500 }
    );
  }
}