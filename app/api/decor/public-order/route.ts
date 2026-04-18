import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type OrderItemPayload = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  product_snapshot: {
    image_url: string | null;
    category_id: string | null;
    subcategory_ids: string[];
    slug: string | null;
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      company_id,
      order_number,
      source,
      client_name,
      client_phone,
      event_date,
      receive_mode,
      delivery_address_json,
      delivery_fee,
      distance_km,
      duration_minutes,
      products_subtotal,
      extra_cost_total,
      total_amount,
      order_status,
      delivery_status,
      contract_status,
      whatsapp_message,
      whatsapp_sent_at,
      notes,
      items,
    } = body as {
      company_id: string;
      order_number: string;
      source: string;
      client_name: string;
      client_phone: string;
      event_date: string;
      receive_mode: "pickup" | "delivery";
      delivery_address_json: any;
      delivery_fee: number;
      distance_km: number | null;
      duration_minutes: number | null;
      products_subtotal: number;
      extra_cost_total: number;
      total_amount: number;
      order_status: string;
      delivery_status: string;
      contract_status: string;
      whatsapp_message: string;
      whatsapp_sent_at: string;
      notes: string | null;
      items: OrderItemPayload[];
    };

    if (!company_id) {
      return NextResponse.json(
        { error: "company_id é obrigatório." },
        { status: 400 }
      );
    }

    if (!client_name?.trim()) {
      return NextResponse.json(
        { error: "Nome do cliente é obrigatório." },
        { status: 400 }
      );
    }

    if (!client_phone?.trim()) {
      return NextResponse.json(
        { error: "Celular do cliente é obrigatório." },
        { status: 400 }
      );
    }

    if (!event_date) {
      return NextResponse.json(
        { error: "Data do evento é obrigatória." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "O pedido precisa ter pelo menos 1 item." },
        { status: 400 }
      );
    }

    const { data: companyExists, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", company_id)
      .single();

    if (companyError || !companyExists) {
      return NextResponse.json(
        { error: "Empresa não encontrada para esse pedido." },
        { status: 404 }
      );
    }

    const { data: orderInserted, error: orderError } = await supabaseAdmin
      .from("decor_orders")
      .insert({
        company_id,
        order_number,
        source,
        client_name,
        client_phone,
        event_date,
        receive_mode,
        delivery_address_json,
        delivery_fee: Number(delivery_fee || 0),
        distance_km: distance_km != null ? Number(distance_km) : null,
        duration_minutes:
          duration_minutes != null ? Number(duration_minutes) : null,
        products_subtotal: Number(products_subtotal || 0),
        extra_cost_total: Number(extra_cost_total || 0),
        total_amount: Number(total_amount || 0),
        order_status,
        delivery_status,
        contract_status,
        whatsapp_message,
        whatsapp_sent_at,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (orderError || !orderInserted?.id) {
      console.error("Erro ao inserir decor_orders:", orderError);

      return NextResponse.json(
        {
          error: "Não foi possível salvar o pedido.",
          details: orderError?.message || null,
        },
        { status: 500 }
      );
    }

    const orderItemsPayload = items.map((item) => ({
      order_id: orderInserted.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: Number(item.unit_price || 0),
      quantity: Number(item.quantity || 0),
      total_price: Number(item.total_price || 0),
      product_snapshot: item.product_snapshot || {},
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("decor_order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error("Erro ao inserir decor_order_items:", itemsError);

      await supabaseAdmin
        .from("decor_orders")
        .delete()
        .eq("id", orderInserted.id);

      return NextResponse.json(
        {
          error: "O pedido não pôde ser finalizado porque os itens falharam.",
          details: itemsError.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: orderInserted.id,
    });
  } catch (error: any) {
    console.error("Erro inesperado em /api/decor/public-order:", error);

    return NextResponse.json(
      {
        error: "Erro interno ao processar o pedido.",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }
}