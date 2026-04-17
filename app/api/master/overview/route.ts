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

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function safeNumber(value: number | null | undefined) {
  return Number(value || 0);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const userEmail = String(body?.userEmail || "").trim().toLowerCase();

    if (userEmail !== MASTER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Acesso não autorizado ao painel master." },
        { status: 403 }
      );
    }

    const [
      companiesRes,
      companyUsersRes,
      ordersRes,
      productsRes,
      categoriesRes,
      subcategoriesRes,
    ] = await Promise.all([
admin
  .from("companies")
  .select("id, name, slug, created_at, plan, plan_status")
  .order("created_at", { ascending: false }),

      admin
        .from("company_users")
        .select(
          "company_id, user_id, role, member_status, display_name, invite_email, joined_at, invited_at"
        ),

      admin
        .from("decor_orders")
        .select(
          "id, company_id, order_number, client_name, client_phone, total_amount, extra_cost_total, order_status, delivery_status, contract_status, event_date, created_at, updated_at"
        )
        .order("created_at", { ascending: false }),

      admin
        .from("decor_products")
        .select("id, company_id, name, is_active, is_featured, created_at"),

      admin
        .from("decor_categories")
        .select("id, company_id, name, is_active"),

      admin
        .from("decor_subcategories")
        .select("id, company_id, name, is_active"),
    ]);

    if (companiesRes.error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao carregar companies: ${companiesRes.error.message}` },
        { status: 500 }
      );
    }

    if (companyUsersRes.error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao carregar company_users: ${companyUsersRes.error.message}` },
        { status: 500 }
      );
    }

    if (ordersRes.error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao carregar decor_orders: ${ordersRes.error.message}` },
        { status: 500 }
      );
    }

    if (productsRes.error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao carregar decor_products: ${productsRes.error.message}` },
        { status: 500 }
      );
    }

    if (categoriesRes.error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao carregar decor_categories: ${categoriesRes.error.message}` },
        { status: 500 }
      );
    }

    if (subcategoriesRes.error) {
      return NextResponse.json(
        { ok: false, error: `Falha ao carregar decor_subcategories: ${subcategoriesRes.error.message}` },
        { status: 500 }
      );
    }

    const companies = (companiesRes.data || []) as any[];
    const companyUsers = (companyUsersRes.data || []) as any[];
    const orders = (ordersRes.data || []) as any[];
    const products = (productsRes.data || []) as any[];
    const categories = (categoriesRes.data || []) as any[];
    const subcategories = (subcategoriesRes.data || []) as any[];

    const mapped = companies.map((company) => {
      const companyId = company.id;

      const companyUsersList = companyUsers.filter(
        (item) => item.company_id === companyId
      );

      const companyOrders = orders.filter((item) => item.company_id === companyId);
      const companyProducts = products.filter((item) => item.company_id === companyId);
      const companyCategories = categories.filter((item) => item.company_id === companyId);
      const companySubcategories = subcategories.filter((item) => item.company_id === companyId);

      const clientSet = new Set<string>();

      companyOrders.forEach((order) => {
        const phone = normalizePhone(order.client_phone);
        const name = normalizeText(order.client_name);
        const key = phone || name || order.id;
        clientSet.add(key);
      });

      const grossRevenue = companyOrders.reduce(
        (acc, item) => acc + safeNumber(item.total_amount),
        0
      );

      const extraCosts = companyOrders.reduce(
        (acc, item) => acc + safeNumber(item.extra_cost_total),
        0
      );

      const estimatedProfit = grossRevenue - extraCosts;
      const ordersCount = companyOrders.length;
      const completedOrdersCount = companyOrders.filter(
        (item) => normalizeText(item.order_status) === "completed"
      ).length;

      const cancelledOrdersCount = companyOrders.filter(
        (item) => normalizeText(item.order_status) === "cancelled"
      ).length;

      const activeUsersCount = companyUsersList.filter((item) =>
        ["active", "accepted"].includes(normalizeText(item.member_status))
      ).length;

      const activeProductsCount = companyProducts.filter(
        (item) => item.is_active !== false
      ).length;

      const featuredProductsCount = companyProducts.filter(
        (item) => item.is_featured === true
      ).length;

      const lastOrderAt =
        companyOrders
          .map((item) => item.updated_at || item.created_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null;

      return {
        id: company.id,
        name: company.name || "Empresa sem nome",
        slug: company.slug || "—",
        createdAt: company.created_at,
        plan: company.plan || "free",
        planStatus: company.plan_status || "—",
        billingStatus: "—",
        billingCycleEndsAt: null,
        trialEndsAt: null,
        usersCount: companyUsersList.length,
        activeUsersCount,
        ordersCount,
        completedOrdersCount,
        cancelledOrdersCount,
        clientsCount: clientSet.size,
        productsCount: companyProducts.length,
        activeProductsCount,
        featuredProductsCount,
        categoriesCount: companyCategories.length,
        subcategoriesCount: companySubcategories.length,
        grossRevenue,
        extraCosts,
        estimatedProfit,
        averageTicket: ordersCount > 0 ? grossRevenue / ordersCount : 0,
        lastOrderAt,
      };
    });

    return NextResponse.json({
      ok: true,
      companies: mapped,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Erro inesperado no painel master.",
      },
      { status: 500 }
    );
  }
}