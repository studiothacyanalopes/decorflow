import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MASTER_EMAIL = "genesismatheusdsl@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const userEmail = String(body?.userEmail || "").trim().toLowerCase();
    const companyId = String(body?.companyId || "").trim();
    const plan = String(body?.plan || "").trim().toLowerCase();
    const planStatus = String(body?.planStatus || "").trim().toLowerCase();
    const active = Boolean(body?.active);
    const maxUsers = Number(body?.maxUsers || 1);

    if (userEmail !== MASTER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Company ID não informado." },
        { status: 400 }
      );
    }

    if (!["free", "start", "pro", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { ok: false, error: "Plano inválido." },
        { status: 400 }
      );
    }

    if (!["trial", "active", "blocked", "cancelled"].includes(planStatus)) {
      return NextResponse.json(
        { ok: false, error: "Status do plano inválido." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(maxUsers) || maxUsers < 1) {
      return NextResponse.json(
        { ok: false, error: "Limite de usuários inválido." },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("companies")
      .update({
        plan,
        plan_status: planStatus,
        active,
        max_users: maxUsers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Empresa atualizada com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro inesperado ao atualizar empresa." },
      { status: 500 }
    );
  }
}