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

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
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
        .select(
          "id, name, slug, email, phone, document, business_type, plan, plan_status, active, created_by, created_at, updated_at, instagram, whatsapp, email_publico, address_line, address_number, address_complement, neighborhood, city, state, zip_code, public_description, public_logo_url, public_cover_url, public_link_enabled, public_link_title, public_link_subtitle, business_hours, maps_link, delivery_enabled, delivery_price_per_km, delivery_minimum_fee, delivery_round_trip_multiplier, delivery_max_distance_km, max_users"
        )
        .order("created_at", { ascending: false }),

      admin
        .from("company_users")
        .select(
          "id, company_id, user_id, role, status, can_manage_company, can_manage_team, can_manage_products, can_manage_orders, can_manage_financial, created_at, updated_at, custom_role, permissions, member_status, display_name, invite_email, invited_at, joined_at"
        ),

      admin
        .from("decor_orders")
        .select(
          "id, company_id, order_number, source, client_name, client_phone, event_date, receive_mode, delivery_fee, products_subtotal, extra_cost_total, total_amount, order_status, delivery_status, contract_status, created_at, updated_at"
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

    const companies = companiesRes.data || [];
    const companyUsers = companyUsersRes.data || [];
    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const subcategories = subcategoriesRes.data || [];

    const mapped = await Promise.all(
      companies.map(async (company: any) => {
        const companyId = company.id;

        const companyUsersList = companyUsers.filter(
          (item: any) => item.company_id === companyId
        );

        const companyOrders = orders.filter((item: any) => item.company_id === companyId);
        const companyProducts = products.filter((item: any) => item.company_id === companyId);
        const companyCategories = categories.filter((item: any) => item.company_id === companyId);
        const companySubcategories = subcategories.filter((item: any) => item.company_id === companyId);

        const clientSet = new Set<string>();

        companyOrders.forEach((order: any) => {
          const phone = normalizePhone(order.client_phone);
          const name = normalizeText(order.client_name);
          const key = phone || name || order.id;
          clientSet.add(key);
        });

        const grossRevenue = companyOrders.reduce(
          (acc: number, item: any) => acc + safeNumber(item.total_amount),
          0
        );

        const extraCosts = companyOrders.reduce(
          (acc: number, item: any) => acc + safeNumber(item.extra_cost_total),
          0
        );

        const estimatedProfit = grossRevenue - extraCosts;
        const ordersCount = companyOrders.length;

        const completedOrdersCount = companyOrders.filter(
          (item: any) => normalizeText(item.order_status) === "completed"
        ).length;

        const cancelledOrdersCount = companyOrders.filter(
          (item: any) => normalizeText(item.order_status) === "cancelled"
        ).length;

        const activeUsersCount = companyUsersList.filter((item: any) =>
          ["active", "accepted"].includes(
            normalizeText(item.member_status || item.status)
          )
        ).length;

        const activeProductsCount = companyProducts.filter(
          (item: any) => item.is_active !== false
        ).length;

        const featuredProductsCount = companyProducts.filter(
          (item: any) => item.is_featured === true
        ).length;

        const owners = companyUsersList.filter(
          (item: any) => normalizeText(item.role) === "owner"
        );

        const ownerUserIds = uniqueStrings([
          ...owners.map((item: any) => item.user_id),
          company.created_by,
        ]);

        const authOwnerProfiles = await Promise.all(
          ownerUserIds.map(async (userId) => {
            try {
              const { data, error } = await admin.auth.admin.getUserById(userId);

              if (error || !data?.user) {
                return null;
              }

              const authUser = data.user;

              return {
                userId,
                fullName:
                  String(
                    authUser.user_metadata?.full_name ||
                      authUser.user_metadata?.name ||
                      ""
                  ).trim(),
                email: String(authUser.email || "").trim(),
              };
            } catch {
              return null;
            }
          })
        );

        const ownerNames = uniqueStrings([
          ...owners.map((item: any) => item.display_name),
          ...owners.map((item: any) => item.invite_email),
          ...authOwnerProfiles.map((item) => item?.fullName),
        ]);

        const ownerEmails = uniqueStrings([
          ...owners.map((item: any) => item.invite_email),
          ...authOwnerProfiles.map((item) => item?.email),
        ]);

        const lastOrderAt =
          companyOrders
            .map((item: any) => item.updated_at || item.created_at)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null;

        return {
          id: company.id,
          name: company.name || "Empresa sem nome",
          slug: company.slug || "—",
          email: company.email || "",
          phone: company.phone || "",
          document: company.document || "",
          businessType: company.business_type || "",
          createdAt: company.created_at,
          updatedAt: company.updated_at,
          plan: company.plan || "free",
          planStatus: company.plan_status || "trial",
          active: company.active ?? true,
          maxUsers: Number(company.max_users || 1),
          ownerNames,
          ownerEmails,
          instagram: company.instagram || "",
          whatsapp: company.whatsapp || "",
          emailPublico: company.email_publico || "",
          addressLine: company.address_line || "",
          addressNumber: company.address_number || "",
          addressComplement: company.address_complement || "",
          neighborhood: company.neighborhood || "",
          city: company.city || "",
          state: company.state || "",
          zipCode: company.zip_code || "",
          publicDescription: company.public_description || "",
          publicLogoUrl: company.public_logo_url || "",
          publicCoverUrl: company.public_cover_url || "",
          publicLinkEnabled: company.public_link_enabled ?? false,
          publicLinkTitle: company.public_link_title || "",
          publicLinkSubtitle: company.public_link_subtitle || "",
          businessHours: company.business_hours || "",
          mapsLink: company.maps_link || "",
          deliveryEnabled: company.delivery_enabled ?? false,
          deliveryPricePerKm: Number(company.delivery_price_per_km || 0),
          deliveryMinimumFee: Number(company.delivery_minimum_fee || 0),
          deliveryRoundTripMultiplier: Number(company.delivery_round_trip_multiplier || 0),
          deliveryMaxDistanceKm: Number(company.delivery_max_distance_km || 0),
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
      })
    );

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