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

    await admin.from("decor_order_costs").delete().eq("company_id", companyId).throwOnError?.();
    await admin.from("decor_order_items").delete().eq("company_id", companyId).throwOnError?.();

    const ordersRes = await admin
      .from("decor_orders")
      .select("id")
      .eq("company_id", companyId);

    if (ordersRes.error) {
      return NextResponse.json(
        { ok: false, error: ordersRes.error.message },
        { status: 500 }
      );
    }

    const orderIds = (ordersRes.data || []).map((item: any) => item.id);

    if (orderIds.length > 0) {
      const deleteOrderItemsRes = await admin
        .from("decor_order_items")
        .delete()
        .in("order_id", orderIds);

      if (deleteOrderItemsRes.error) {
        return NextResponse.json(
          { ok: false, error: deleteOrderItemsRes.error.message },
          { status: 500 }
        );
      }

      const deleteOrderCostsRes = await admin
        .from("decor_order_costs")
        .delete()
        .in("order_id", orderIds);

      if (deleteOrderCostsRes.error) {
        return NextResponse.json(
          { ok: false, error: deleteOrderCostsRes.error.message },
          { status: 500 }
        );
      }
    }

    const deletions = await Promise.all([
      admin.from("decor_orders").delete().eq("company_id", companyId),
      admin.from("decor_products").delete().eq("company_id", companyId),
      admin.from("decor_subcategories").delete().eq("company_id", companyId),
      admin.from("decor_categories").delete().eq("company_id", companyId),
      admin.from("company_team_invites").delete().eq("company_id", companyId),
      admin.from("company_invites").delete().eq("company_id", companyId),
      admin.from("company_users").delete().eq("company_id", companyId),
      admin.from("companies").delete().eq("id", companyId),
    ]);

    for (const result of deletions) {
      if (result.error) {
        return NextResponse.json(
          { ok: false, error: result.error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Empresa excluída com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro inesperado ao excluir empresa." },
      { status: 500 }
    );
  }
}