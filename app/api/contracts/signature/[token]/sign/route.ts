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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const formData = await req.formData();

    const signatureName = String(formData.get("signature_name") || "");
    const signatureDocument = String(formData.get("signature_document") || "");
    const accepted = String(formData.get("accepted") || "") === "true";

    if (!accepted || !signatureName.trim()) {
      return NextResponse.json(
        { ok: false, error: "Aceite e nome da assinatura são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: signer, error: signerError } = await supabase
      .from("decor_signature_signers")
      .select("*")
      .eq("unique_token", token)
      .single();

    if (signerError || !signer) {
      return NextResponse.json(
        { ok: false, error: "Assinante não encontrado." },
        { status: 404 }
      );
    }

    const evidence: Record<string, string> = {};

const selfie = formData.get("selfie");
const documentFront = formData.get("document_front");
const documentBack = formData.get("document_back");
const signatureImage = formData.get("signature_image");

console.log("DEBUG SIGN FILES:", {
  selfie:
    selfie instanceof File
      ? {
          name: selfie.name,
          type: selfie.type,
          size: selfie.size,
        }
      : null,
  documentFront:
    documentFront instanceof File
      ? {
          name: documentFront.name,
          type: documentFront.type,
          size: documentFront.size,
        }
      : null,
  documentBack:
    documentBack instanceof File
      ? {
          name: documentBack.name,
          type: documentBack.type,
          size: documentBack.size,
        }
      : null,
  signatureImage:
    signatureImage instanceof File
      ? {
          name: signatureImage.name,
          type: signatureImage.type,
          size: signatureImage.size,
        }
      : null,
});

    async function uploadIfExists(fileValue: FormDataEntryValue | null, suffix: string) {
      if (!(fileValue instanceof File) || fileValue.size === 0) return null;

      const arrayBuffer = await fileValue.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const path = `${signer.company_id}/${signer.order_id}/${signer.id}/${suffix}-${Date.now()}-${fileValue.name}`;

      const { error } = await supabase.storage
        .from("contract-signature-evidence")
        .upload(path, buffer, {
          contentType: fileValue.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        throw new Error(`Erro ao enviar arquivo ${suffix}: ${error.message}`);
      }

      return path;
    }

const selfiePath = await uploadIfExists(selfie, "selfie");
const frontPath = await uploadIfExists(documentFront, "document-front");
const backPath = await uploadIfExists(documentBack, "document-back");
const signatureImagePath = await uploadIfExists(signatureImage, "signature-image");

if (selfiePath) evidence.selfie = selfiePath;
if (frontPath) evidence.document_front = frontPath;
if (backPath) evidence.document_back = backPath;
if (signatureImagePath) evidence.signature_image = signatureImagePath;

    if (signer.require_selfie && !evidence.selfie) {
      return NextResponse.json(
        { ok: false, error: "Selfie obrigatória." },
        { status: 400 }
      );
    }

    if (!evidence.signature_image) {
  return NextResponse.json(
    { ok: false, error: "A assinatura desenhada é obrigatória." },
    { status: 400 }
  );
}

    if (signer.require_document_front && !evidence.document_front) {
      return NextResponse.json(
        { ok: false, error: "Frente do documento obrigatória." },
        { status: 400 }
      );
    }

    if (signer.require_document_back && !evidence.document_back) {
      return NextResponse.json(
        { ok: false, error: "Verso do documento obrigatório." },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";
    const userAgent = req.headers.get("user-agent") || "";

    const now = new Date().toISOString();

    const { error: updateSignerError } = await supabase
      .from("decor_signature_signers")
      .update({
        status: "signed",
        signed_at: now,
        signature_name: signatureName.trim(),
        signature_document: signatureDocument.trim() || null,
        ip_address: ip,
        user_agent: userAgent,
        evidence_json: evidence,
      })
      .eq("id", signer.id);

    if (updateSignerError) {
      return NextResponse.json(
        { ok: false, error: updateSignerError.message },
        { status: 500 }
      );
    }

    await supabase.from("decor_signature_events").insert({
      company_id: signer.company_id,
      order_id: signer.order_id,
      request_id: signer.request_id,
      signer_id: signer.id,
      event_type: "signed",
      description: `${signatureName} assinou digitalmente o documento.`,
      payload: {
        signature_document: signatureDocument || null,
      },
    });

    const { data: allSigners } = await supabase
      .from("decor_signature_signers")
      .select("id, status")
      .eq("request_id", signer.request_id);

    const allSigned = (allSigners || []).every((item) => item.status === "signed");

    if (allSigned) {
      await supabase
        .from("decor_signature_requests")
        .update({
          status: "signed",
          completed_at: now,
        })
        .eq("id", signer.request_id);

      await supabase
        .from("decor_orders")
        .update({
          contract_status: "signed",
          contract_signed_at: now,
        })
        .eq("id", signer.order_id);
    } else {
      await supabase
        .from("decor_signature_requests")
        .update({
          status: "partially_signed",
        })
        .eq("id", signer.request_id);
    }

    return NextResponse.json({
      ok: true,
      fully_signed: allSigned,
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