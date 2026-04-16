"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  MessageCircle,
  Moon,
  ChevronRight,
  Package2,
  Sparkles,
  MapPin,
  Clock3,
  AtSign,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  Mail,
  CalendarDays,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
  whatsapp: string;
  instagram: string;
  email_publico: string;
  city: string;
  state: string;
  address_line: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  zip_code: string;
  maps_link: string;
  business_hours: string;
  public_description: string;
  public_logo_url: string;
  public_cover_url: string;
  public_link_title: string;
  public_link_subtitle: string;
  delivery_enabled?: boolean | null;
  delivery_price_per_km?: number | null;
  delivery_minimum_fee?: number | null;
  delivery_round_trip_multiplier?: number | null;
  delivery_max_distance_km?: number | null;
};

type Category = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type Subcategory = {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type Product = {
  id: string;
  company_id: string;
  category_id: string | null;
  subcategory_ids: string[];
  name: string;
  slug: string;
  description: string | null;
  price: number | string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  is_featured: boolean;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type CheckoutAddress = {
  zip_code: string;
  address_line: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
};

function formatPrice(value: number | string | null | undefined) {
  const numberValue = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
}

function cleanPhone(phone?: string | null) {
  return String(phone || "").replace(/\D/g, "");
}

function formatZipCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildWhatsAppUrl(phone?: string | null, text?: string) {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return "#";
  const base = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  const message = encodeURIComponent(
    text || "Olá! Tenho interesse nos seus produtos."
  );
  return `https://wa.me/${base}?text=${message}`;
}

function formatPhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatDateLabel(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function productMainImage(product: Product | { image_url?: string | null; gallery_urls?: string[] | null }) {
  if (product.image_url) return product.image_url;
  if (Array.isArray(product.gallery_urls) && product.gallery_urls.length > 0) {
    return product.gallery_urls[0];
  }
  return "";
}

function isLooseItem(
  product: Product,
  category?: Category,
  subcategory?: Subcategory
) {
  const text = [
    product.name,
    product.description || "",
    category?.name || "",
    subcategory?.name || "",
  ]
    .join(" ")
    .toLowerCase();

  return /avulso|avulsos|item|itens|complemento|complementos|tapete|painel|cilindro|suporte|bandeja|mesa|vaso|arco/i.test(
    text
  );
}

function getProductSubcategories(
  product: Product,
  subcategories: Subcategory[]
) {
  return subcategories.filter(
    (item) =>
      Array.isArray(product.subcategory_ids) &&
      product.subcategory_ids.includes(item.id)
  );
}

function buildAddress(company: Company) {
  return [
    company.address_line,
    company.address_number,
    company.address_complement,
    company.neighborhood,
    company.city,
    company.state,
    company.zip_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function calculateDeliveryFee(company: Company | null, distanceKm: string) {
  if (!company?.delivery_enabled) return 0;

  const km = Number(distanceKm || 0);
  const pricePerKm = Number(company.delivery_price_per_km || 0);
  const minimumFee = Number(company.delivery_minimum_fee || 0);
  const multiplier = Number(company.delivery_round_trip_multiplier || 1);

  const raw = km * pricePerKm * multiplier;
  return Math.max(raw, minimumFee);
}

function CompanyMedia({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string | null;
  alt: string;
  fallback: React.ReactNode;
  className: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default function EmpresaPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);

  const [selectedEventDate, setSelectedEventDate] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "delivery">("pickup");
  const [deliveryFeeCalculated, setDeliveryFeeCalculated] = useState(false);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(0);
  const [calculatedDistanceKm, setCalculatedDistanceKm] = useState<number | null>(null);
  const [calculatedDurationMinutes, setCalculatedDurationMinutes] = useState<number | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryPickupAddress, setDeliveryPickupAddress] = useState("");

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutFormError, setCheckoutFormError] = useState("");

  const [checkoutAddress, setCheckoutAddress] = useState<CheckoutAddress>({
    zip_code: "",
    address_line: "",
    address_number: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
  });

  useEffect(() => {
    if (!slug) return;
    loadPublicCatalog();
  }, [slug]);

  async function loadPublicCatalog() {
    try {
      setLoading(true);

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          whatsapp,
          instagram,
          email_publico,
          city,
          state,
          address_line,
          address_number,
          address_complement,
          neighborhood,
          zip_code,
          maps_link,
          business_hours,
          public_description,
          public_logo_url,
          public_cover_url,
          public_link_title,
          public_link_subtitle,
          delivery_enabled,
          delivery_price_per_km,
          delivery_minimum_fee,
          delivery_round_trip_multiplier,
          delivery_max_distance_km
        `)
        .eq("slug", slug)
        .eq("public_link_enabled", true)
        .single();

      if (companyError || !companyData) {
        setCompany(null);
        setLoading(false);
        return;
      }

      setCompany(companyData);

      const [categoriesRes, subcategoriesRes, productsRes] = await Promise.all([
        supabase
          .from("decor_categories")
          .select("id, company_id, name, slug, sort_order")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("decor_subcategories")
          .select("id, company_id, category_id, name, slug, sort_order")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

supabase
  .from("decor_products")
  .select(`
    id,
    company_id,
    category_id,
    subcategory_ids,
    name,
    slug,
    description,
    price,
    image_url,
    gallery_urls,
    is_featured
  `)
  .eq("company_id", companyData.id)
  .eq("is_active", true)
  .order("is_featured", { ascending: false })
  .order("sort_order", { ascending: true })
  .order("created_at", { ascending: false }),
      ]);

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      setProducts(productsRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const filteredSubcategories = useMemo(() => {
    if (selectedCategory === "all") return subcategories;
    const category = categories.find((item) => item.slug === selectedCategory);
    if (!category) return [];
    return subcategories.filter((item) => item.category_id === category.id);
  }, [selectedCategory, categories, subcategories]);

const visibleProducts = useMemo(() => {
  const normalizedSearch = search.trim().toLowerCase();

  return products.filter((product) => {
    const category = categories.find((item) => item.id === product.category_id);
    const productSubcategories = getProductSubcategories(product, subcategories);

    const matchCategory =
      selectedCategory === "all" || category?.slug === selectedCategory;

    const matchSubcategory =
      selectedSubcategory === "all" ||
      productSubcategories.some((item) => item.slug === selectedSubcategory);

    const haystack = [
      product.name,
      product.description || "",
      category?.name || "",
      ...productSubcategories.map((item) => item.name || ""),
    ]
      .join(" ")
      .toLowerCase();

    const matchSearch =
      !normalizedSearch || haystack.includes(normalizedSearch);

    return matchCategory && matchSubcategory && matchSearch;
  });
}, [
  search,
  selectedCategory,
  selectedSubcategory,
  products,
  categories,
  subcategories,
]);

  const highlightedProducts = useMemo(() => {
    return visibleProducts.filter((product) => product.is_featured).slice(0, 4);
  }, [visibleProducts]);

const buildKitProducts = useMemo(() => {
  return visibleProducts.filter((product) => {
    const category = categories.find((item) => item.id === product.category_id);
    const productSubcategories = getProductSubcategories(product, subcategories);
    return isLooseItem(product, category, productSubcategories[0]);
  });
}, [visibleProducts, categories, subcategories]);

const regularProducts = useMemo(() => {
  return visibleProducts.filter((product) => {
    const category = categories.find((item) => item.id === product.category_id);
    const productSubcategories = getProductSubcategories(product, subcategories);
    return !isLooseItem(product, category, productSubcategories[0]);
  });
}, [visibleProducts, categories, subcategories]);

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const productsSubtotal = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + Number(item.product.price || 0) * item.quantity,
        0
      ),
    [cart]
  );

  const deliveryFee = useMemo(() => {
    if (deliveryMode !== "delivery") return 0;
    if (!deliveryFeeCalculated) return 0;
    return calculatedDeliveryFee;
  }, [deliveryMode, deliveryFeeCalculated, calculatedDeliveryFee]);

  const totalWithDelivery = useMemo(() => {
    return productsSubtotal + deliveryFee;
  }, [productsSubtotal, deliveryFee]);

  function updateCheckoutField<K extends keyof CheckoutAddress>(
    field: K,
    value: CheckoutAddress[K]
  ) {
    setCheckoutAddress((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field !== "reference") {
      resetDeliveryCalculation();
    }
  }

  function resetDeliveryCalculation() {
    setDeliveryFeeCalculated(false);
    setCalculatedDeliveryFee(0);
    setCalculatedDistanceKm(null);
    setCalculatedDurationMinutes(null);
    setDeliveryError("");
    setDeliveryPickupAddress("");
  }

  async function handleZipCodeBlur() {
    const cleanZip = checkoutAddress.zip_code.replace(/\D/g, "");

    if (cleanZip.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      const data = await response.json();

      if (data?.erro) {
        setDeliveryError("Não foi possível localizar esse CEP.");
        return;
      }

      setCheckoutAddress((prev) => ({
        ...prev,
        address_line: data.logradouro || prev.address_line,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));

      setDeliveryError("");
    } catch {
      setDeliveryError("Não foi possível consultar o CEP agora.");
    }
  }

   async function handleCalculateDelivery() {
    if (deliveryMode !== "delivery") return;

    if (!checkoutAddress.zip_code.replace(/\D/g, "")) {
      setDeliveryError("Informe o CEP para calcular a entrega.");
      return;
    }

    if (!checkoutAddress.address_line.trim()) {
      setDeliveryError("Informe a rua ou avenida da entrega.");
      return;
    }

    if (!checkoutAddress.address_number.trim()) {
      setDeliveryError("Informe o número do endereço.");
      return;
    }

    if (!checkoutAddress.neighborhood.trim()) {
      setDeliveryError("Informe o bairro.");
      return;
    }

    if (!checkoutAddress.city.trim()) {
      setDeliveryError("Informe a cidade.");
      return;
    }

    if (!checkoutAddress.state.trim()) {
      setDeliveryError("Informe o estado.");
      return;
    }

    if (!company?.zip_code && !company?.address_line) {
      setDeliveryError("O endereço da empresa ainda não está configurado corretamente.");
      return;
    }

    setIsCalculatingDelivery(true);
    setDeliveryError("");

    try {
      const response = await fetch("/api/frete/calcular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: {
            zip_code: company?.zip_code || "",
            address_line: company?.address_line || "",
            address_number: company?.address_number || "",
            neighborhood: company?.neighborhood || "",
            city: company?.city || "",
            state: company?.state || "",
          },
          destination: {
            zip_code: checkoutAddress.zip_code,
            address_line: checkoutAddress.address_line,
            address_number: checkoutAddress.address_number,
            neighborhood: checkoutAddress.neighborhood,
            city: checkoutAddress.city,
            state: checkoutAddress.state,
          },
        pricing: {
          price_per_km: Number(company?.delivery_price_per_km || 0),
          minimum_fee: Number(company?.delivery_minimum_fee || 0),
          round_trip_multiplier: Number(company?.delivery_round_trip_multiplier || 1),
          max_distance_km: Number(company?.delivery_max_distance_km || 10),
        },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeliveryFeeCalculated(false);
        setCalculatedDeliveryFee(0);
        setCalculatedDistanceKm(
          data?.distance_km != null ? Number(data.distance_km) : null
        );
        setCalculatedDurationMinutes(null);
        setDeliveryPickupAddress(data?.pickup_address || companyAddress || "");
        setDeliveryError(
          data?.message || data?.error || "Não foi possível calcular o frete."
        );
        return;
      }

      setCalculatedDeliveryFee(Number(data.final_freight || 0));
      setCalculatedDistanceKm(Number(data.distance_km || 0));
      setCalculatedDurationMinutes(Number(data.duration_minutes || 0));
      setDeliveryFeeCalculated(true);
      setDeliveryPickupAddress("");
      setDeliveryError("");
    } catch {
      setDeliveryError("Não foi possível calcular o frete agora.");
    } finally {
      setIsCalculatingDelivery(false);
    }
  }

  function openProductDetails(product: Product) {
    setSelectedProduct(product);
    setProductDetailsOpen(true);
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { product, quantity: 1 }];
    });
  }

  function handleAddToCartFromDetails(product: Product) {
    if (!selectedEventDate) {
      alert("Selecione a data do evento antes de adicionar.");
      return;
    }

    if (company?.delivery_enabled && deliveryMode === "delivery" && !deliveryFeeCalculated) {
      alert("Calcule o frete antes de adicionar ao carrinho.");
      return;
    }

    addToCart(product);
    setProductDetailsOpen(false);
    setCartOpen(true);
  }

  function increaseItem(productId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseItem(productId: string) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

    function openCheckoutModal() {
    if (!selectedEventDate) {
      alert("Selecione a data do evento antes de finalizar a compra.");
      return;
    }

    if (cart.length === 0) {
      alert("Adicione pelo menos um item ao carrinho antes de finalizar.");
      return;
    }

    if (company?.delivery_enabled && deliveryMode === "delivery" && !deliveryFeeCalculated) {
      alert("Calcule o frete antes de finalizar a compra.");
      return;
    }

    setCheckoutFormError("");
    setCheckoutModalOpen(true);
  }

  function closeCheckoutModal() {
    setCheckoutModalOpen(false);
    setCheckoutFormError("");
  }

  function buildCheckoutMessage() {
    if (!company) return "";

    const itemsText = cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.name} - Qtd: ${item.quantity} - ${formatPrice(
            Number(item.product.price || 0) * item.quantity
          )}`
      )
      .join("\n");

    const receiveModeText =
      deliveryMode === "delivery" ? "Entrega" : "Retirada";

    const deliveryText =
      deliveryMode === "delivery"
        ? [
            `CEP: ${checkoutAddress.zip_code || "Não informado"}`,
            `Endereço: ${
              [
                checkoutAddress.address_line,
                checkoutAddress.address_number,
                checkoutAddress.neighborhood,
                checkoutAddress.city,
                checkoutAddress.state,
              ]
                .filter(Boolean)
                .join(", ") || "Não informado"
            }`,
            `Referência: ${checkoutAddress.reference || "Não informada"}`,
            `Distância estimada: ${
              calculatedDistanceKm != null
                ? `${calculatedDistanceKm.toFixed(2)} km`
                : "Não calculada"
            }`,
            `Tempo estimado: ${
              calculatedDurationMinutes != null
                ? `${calculatedDurationMinutes} min`
                : "Não calculado"
            }`,
            `Frete: ${deliveryFeeCalculated ? formatPrice(deliveryFee) : "Não calculado"}`,
          ].join("\n")
        : `Retirada no local: ${companyAddress || "Endereço não informado"}`;

    return [
      `Olá! Quero finalizar uma compra no catálogo da ${company.name}.`,
      "",
      `Nome: ${checkoutName.trim()}`,
      `Celular: ${checkoutPhone.trim()}`,
      `Data do evento: ${formatDateLabel(selectedEventDate) || "Não informada"}`,
      `Forma de recebimento: ${receiveModeText}`,
      "",
      "Itens:",
      itemsText,
      "",
      deliveryText,
      "",
      `Subtotal dos itens: ${formatPrice(productsSubtotal)}`,
      `Total final: ${formatPrice(totalWithDelivery)}`,
      "",
      "Pode seguir com meu pedido?",
    ].join("\n");
  }

async function handleFinishCheckout() {
  setCheckoutFormError("");

  if (!company) {
    setCheckoutFormError("Empresa não encontrada para finalizar o pedido.");
    return;
  }

  if (!checkoutName.trim()) {
    setCheckoutFormError("Informe seu nome para finalizar.");
    return;
  }

  const digits = formatPhoneDigits(checkoutPhone);

  if (digits.length < 10) {
    setCheckoutFormError("Informe um celular válido com DDD.");
    return;
  }

  if (!selectedEventDate) {
    setCheckoutFormError("Selecione a data do evento antes de finalizar.");
    return;
  }

  if (cart.length === 0) {
    setCheckoutFormError("Adicione pelo menos um item ao carrinho.");
    return;
  }

  if (
    company.delivery_enabled &&
    deliveryMode === "delivery" &&
    !deliveryFeeCalculated
  ) {
    setCheckoutFormError("Calcule o frete antes de finalizar.");
    return;
  }

  const whatsappMessage = buildCheckoutMessage();

  const orderNumber = `PED-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;

  const deliveryAddressJson =
    deliveryMode === "delivery"
      ? {
          zip_code: checkoutAddress.zip_code || "",
          address_line: checkoutAddress.address_line || "",
          address_number: checkoutAddress.address_number || "",
          neighborhood: checkoutAddress.neighborhood || "",
          city: checkoutAddress.city || "",
          state: checkoutAddress.state || "",
          reference: checkoutAddress.reference || "",
        }
      : null;

  try {
    const { data: orderInserted, error: orderError } = await supabase
      .from("decor_orders")
      .insert({
        company_id: company.id,
        order_number: orderNumber,
        source: "public_catalog",
        client_name: checkoutName.trim(),
        client_phone: digits,
        event_date: selectedEventDate,
        receive_mode: deliveryMode,
        delivery_address_json: deliveryAddressJson,
        delivery_fee: Number(deliveryFee || 0),
        distance_km:
          calculatedDistanceKm != null ? Number(calculatedDistanceKm) : null,
        duration_minutes:
          calculatedDurationMinutes != null
            ? Number(calculatedDurationMinutes)
            : null,
        products_subtotal: Number(productsSubtotal || 0),
        extra_cost_total: 0,
        total_amount: Number(totalWithDelivery || 0),
        order_status: "new",
        delivery_status: "pending",
        contract_status: "not_sent",
        whatsapp_message: whatsappMessage,
        whatsapp_sent_at: new Date().toISOString(),
        notes: null,
      })
      .select("id")
      .single();

    if (orderError || !orderInserted?.id) {
      console.error("Erro ao salvar pedido:", orderError);
      setCheckoutFormError("Não foi possível salvar o pedido no sistema.");
      return;
    }

    const orderItemsPayload = cart.map((item) => ({
      order_id: orderInserted.id,
      product_id: item.product.id,
      product_name: item.product.name,
      unit_price: Number(item.product.price || 0),
      quantity: Number(item.quantity || 0),
      total_price: Number(item.product.price || 0) * Number(item.quantity || 0),
      product_snapshot: {
        image_url: item.product.image_url || productMainImage(item.product) || null,
        category_id: item.product.category_id || null,
        subcategory_ids: Array.isArray(item.product.subcategory_ids)
          ? item.product.subcategory_ids
          : [],
        slug: item.product.slug || null,
      },
    }));

    if (orderItemsPayload.length > 0) {
      const { error: itemsError } = await supabase
        .from("decor_order_items")
        .insert(orderItemsPayload);

      if (itemsError) {
        console.error("Erro ao salvar itens do pedido:", itemsError);
        setCheckoutFormError(
          "O pedido foi criado, mas houve erro ao salvar os itens."
        );
        return;
      }
    }

    const whatsappUrl = buildWhatsAppUrl(company.whatsapp, whatsappMessage);

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    setCheckoutModalOpen(false);
    setCheckoutFormError("");
    setCheckoutName("");
    setCheckoutPhone("");
    setCart([]);
    setCartOpen(false);
    setProductDetailsOpen(false);
    setSelectedProduct(null);
    setSelectedEventDate("");
    setDeliveryMode("pickup");
    setDeliveryFeeCalculated(false);
    setCalculatedDeliveryFee(0);
    setCalculatedDistanceKm(null);
    setCalculatedDurationMinutes(null);
    setDeliveryError("");
    setDeliveryPickupAddress("");
    setCheckoutAddress({
      zip_code: "",
      address_line: "",
      address_number: "",
      neighborhood: "",
      city: "",
      state: "",
      reference: "",
    });
  } catch (error) {
    console.error("Erro inesperado ao finalizar pedido:", error);
    setCheckoutFormError("Ocorreu um erro inesperado ao finalizar o pedido.");
  }
}



  if (loading) {
    return (
      <main className="min-h-screen bg-[#050814] text-white">
        <div className="mx-auto flex min-h-screen max-w-[1500px] items-center justify-center px-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80">
            Carregando catálogo...
          </div>
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="min-h-screen bg-[#050814] text-white">
        <div className="mx-auto flex min-h-screen max-w-[1500px] items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-center">
            <p className="text-lg font-semibold">Página não encontrada</p>
            <p className="mt-2 text-sm text-white/70">
              Esse link público não está disponível no momento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const companyAddress = buildAddress(company);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f1d44_0%,#07111f_18%,#050814_45%,#050814_100%)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1c]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
              <CompanyMedia
                src={company.public_logo_url}
                alt={company.name}
                className="h-full w-full object-cover"
                fallback={
                  <span className="text-sm font-bold">
                    {(company.name || "DF").slice(0, 2).toUpperCase()}
                  </span>
                }
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold text-white">
                {company.name}
              </h1>
              <p className="truncate text-xs text-white/55">
                {company.city}
                {company.city && company.state ? " - " : ""}
                {company.state}
              </p>
            </div>
          </div>

          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            <a
              href="#kits"
              className="rounded-2xl px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Kits
            </a>
            <a
              href="#monte-seu-kit"
              className="rounded-2xl px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Monte seu kit
            </a>
            <a
              href="#contato"
              className="rounded-2xl px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Contato
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href={buildWhatsAppUrl(
                company.whatsapp,
                `Olá! Vim pelo catálogo público da ${company.name} e quero mais informações.`
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#16c45b] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,196,91,0.22)] transition hover:opacity-95"
            >
              <MessageCircle className="h-4 w-4" />
              Fale conosco
            </a>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="h-11 w-[260px] rounded-2xl border border-white/10 bg-[#121a2e] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
              />
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#121a2e] text-white/80"
            >
              <Moon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
            <a
              href={buildWhatsAppUrl(
                company.whatsapp,
                `Olá! Vim pelo catálogo público da ${company.name} e quero mais informações.`
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#16c45b] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,196,91,0.22)] transition hover:opacity-95"
            >
              <MessageCircle className="h-4 w-4" />
              Fale conosco
            </a>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <a
                href="#kits"
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80"
              >
                Kits
              </a>
              <a
                href="#monte-seu-kit"
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80"
              >
                Monte seu kit
              </a>
              <a
                href="#contato"
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80"
              >
                Contato
              </a>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="shrink-0 rounded-2xl border border-[#8b7cf6]/30 bg-[#8b7cf6]/15 px-4 py-2 text-sm font-semibold text-[#d7d1ff]"
              >
                Kit ({cartCount})
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-4 pb-10 pt-4 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1018] shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
          <div className="relative h-[220px] w-full sm:h-[280px] lg:h-[360px]">
            <CompanyMedia
              src={company.public_cover_url}
              alt={company.name}
              className="h-full w-full object-cover"
              fallback={
                <div className="h-full w-full bg-[linear-gradient(135deg,#101827_0%,#223d92_55%,#101827_100%)]" />
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050814] via-[#050814]/45 to-transparent" />
          </div>

          <div className="relative px-4 pb-6 sm:px-6 lg:px-7">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border-4 border-[#0b1018] bg-[#121a2e] shadow-xl">
              <CompanyMedia
                src={company.public_logo_url}
                alt={company.name}
                className="h-full w-full object-cover"
                fallback={
                  <span className="text-lg font-bold text-white">
                    {(company.name || "DF").slice(0, 2).toUpperCase()}
                  </span>
                }
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white/75">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catálogo público premium
                </div>

                <h2 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-white sm:text-[38px]">
                  {company.public_link_title || company.name}
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70 sm:text-[15px]">
                  {company.public_link_subtitle ||
                    company.public_description ||
                    "Confira os temas, kits, itens avulsos e monte sua combinação ideal."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {company.instagram ? (
                    <a
                      href={`https://instagram.com/${company.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      <AtSign className="h-4 w-4" />
                      {company.instagram}
                    </a>
                  ) : null}

                  {companyAddress ? (
                    <a
                      href={company.maps_link || "#contato"}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 ${
                        !company.maps_link ? "pointer-events-none opacity-70" : ""
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      {company.city}
                      {company.city && company.state ? " - " : ""}
                      {company.state}
                    </a>
                  ) : null}

                  {company.business_hours ? (
                    <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                      <Clock3 className="h-4 w-4" />
                      Funcionamento
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Itens encontrados
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {visibleProducts.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="rounded-2xl border border-[#8b7cf6]/30 bg-[#8b7cf6]/15 px-4 py-3 text-left transition hover:bg-[#8b7cf6]/20"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d7d1ff]/80">
                    Monte seu kit
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {cartCount} item(ns)
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSelectedSubcategory("all");
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              selectedCategory === "all"
                ? "bg-[#8b7cf6] text-white shadow-[0_14px_26px_rgba(139,124,246,0.28)]"
                : "border border-white/10 bg-[#121a2e] text-white/75 hover:bg-white/5"
            }`}
          >
            Todos
          </button>

          {categories.map((category) => {
            const count = products.filter(
              (item) => item.category_id === category.id
            ).length;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(category.slug);
                  setSelectedSubcategory("all");
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  selectedCategory === category.slug
                    ? "bg-[#8b7cf6] text-white shadow-[0_14px_26px_rgba(139,124,246,0.28)]"
                    : "border border-white/10 bg-[#121a2e] text-white/75 hover:bg-white/5"
                }`}
              >
                {category.name}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filteredSubcategories.length > 0 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedSubcategory("all")}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                selectedSubcategory === "all"
                  ? "bg-white text-[#0b1018]"
                  : "border border-white/10 bg-[#121a2e] text-white/75 hover:bg-white/5"
              }`}
            >
              Todos os temas
            </button>

            {filteredSubcategories.map((subcategory) => {
              const count = products.filter(
                (item) =>
                  Array.isArray(item.subcategory_ids) &&
                  item.subcategory_ids.includes(subcategory.id)
              ).length;

              return (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => setSelectedSubcategory(subcategory.slug)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    selectedSubcategory === subcategory.slug
                      ? "bg-white text-[#0b1018]"
                      : "border border-white/10 bg-[#121a2e] text-white/75 hover:bg-white/5"
                  }`}
                >
                  {subcategory.name}
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {highlightedProducts.length > 0 ? (
          <section id="destaques" className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Destaques</h3>
                <p className="text-sm text-white/60">
                  Os temas e kits mais fortes da vitrine.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {highlightedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  company={company}
                  category={categories.find((item) => item.id === product.category_id)}
subcategory={getProductSubcategories(product, subcategories)[0]}
                  onOpenDetails={openProductDetails}
                  compact={false}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section id="kits" className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Kits e temas</h3>
              <p className="text-sm text-white/60">
                Escolha o tema ideal e veja os detalhes completos.
              </p>
            </div>
          </div>

          {regularProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {regularProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  company={company}
                  category={categories.find((item) => item.id === product.category_id)}
subcategory={getProductSubcategories(product, subcategories)[0]}
                  onOpenDetails={openProductDetails}
                  compact
                />
              ))}
            </div>
          )}
        </section>

        <section id="monte-seu-kit" className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Monte seu kit</h3>
              <p className="text-sm text-white/60">
                Adicione itens avulsos ao seu kit e finalize direto no WhatsApp.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#8b7cf6]/30 bg-[#8b7cf6]/15 px-4 py-2.5 text-sm font-semibold text-[#d7d1ff] transition hover:bg-[#8b7cf6]/20"
            >
              <ShoppingBag className="h-4 w-4" />
              Ver kit ({cartCount})
            </button>
          </div>

          {buildKitProducts.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-[#0b1018] px-6 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/70">
                <Package2 className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-semibold text-white">
                Ainda não há itens avulsos cadastrados
              </p>
              <p className="mt-2 text-sm text-white/60">
                Cadastre itens como tapetes, painéis, cilindros, bandejas e complementos para montar kits.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {buildKitProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  company={company}
                  category={categories.find((item) => item.id === product.category_id)}
subcategory={getProductSubcategories(product, subcategories)[0]}
                  onOpenDetails={openProductDetails}
                  compact
                  actionLabel="Ver detalhes"
                />
              ))}
            </div>
          )}
        </section>

        <section id="contato" className="mt-10">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-[#0b1018] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <h3 className="text-xl font-semibold text-white">
                Informações da empresa
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Todos os detalhes principais da operação em um só lugar.
              </p>

              <div className="mt-5 grid gap-3">
                {companyAddress ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-white/65" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                          Endereço
                        </p>
                        <p className="mt-1 text-sm text-white/85">{companyAddress}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {company.business_hours ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-white/65" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                          Funcionamento
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap text-sm font-sans text-white/85">
                          {company.business_hours}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : null}

                {company.email_publico ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-white/65" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                          E-mail
                        </p>
                        <p className="mt-1 text-sm text-white/85">
                          {company.email_publico}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#0b1018] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <h3 className="text-xl font-semibold text-white">
                Ação rápida
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Finalize o atendimento por WhatsApp ou abra a localização.
              </p>

              <div className="mt-5 grid gap-3">
                <a
                  href={buildWhatsAppUrl(
                    company.whatsapp,
                    `Olá! Vim pelo catálogo da ${company.name} e quero atendimento.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#16c45b] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,196,91,0.22)] transition hover:opacity-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </a>

                <a
                  href={company.maps_link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 ${
                    !company.maps_link ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir localização
                </a>

                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#8b7cf6]/30 bg-[#8b7cf6]/15 px-4 text-sm font-semibold text-[#d7d1ff] transition hover:bg-[#8b7cf6]/20"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Finalizar meu kit
                </button>
              </div>
            </div>
          </div>
        </section>
      </section>

      <div
        className={`fixed inset-0 z-[60] transition ${
          productDetailsOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition ${
            productDetailsOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setProductDetailsOpen(false)}
        />

        <div
          className={`absolute inset-0 overflow-y-auto transition duration-300 ${
            productDetailsOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="min-h-screen bg-[#050814] px-4 py-6 text-white sm:px-6 lg:px-8">
            {selectedProduct ? (
              <div className="mx-auto max-w-[1400px]">
                <button
                  type="button"
                  onClick={() => setProductDetailsOpen(false)}
                  className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                  Fechar
                </button>

                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1018]">
                    <div className="aspect-[0.9/1] w-full overflow-hidden bg-[#121a2e]">
                      {productMainImage(selectedProduct) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={productMainImage(selectedProduct)}
                          alt={selectedProduct.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/35">
                          <Package2 className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-white/10 bg-[#0b1018] p-6">
                    <div className="flex flex-wrap gap-2">
                      {categories.find((item) => item.id === selectedProduct.category_id) ? (
                        <span className="rounded-full bg-[#f59e0b]/15 px-3 py-1 text-xs font-semibold text-[#fbbf24]">
                          {
                            categories.find(
                              (item) => item.id === selectedProduct.category_id
                            )?.name
                          }
                        </span>
                      ) : null}

                    {getProductSubcategories(selectedProduct, subcategories).map((subcategory) => (
                      <span
                        key={subcategory.id}
                        className="rounded-full bg-[#60a5fa]/15 px-3 py-1 text-xs font-semibold text-[#93c5fd]"
                      >
                        {subcategory.name}
                      </span>
                    ))}
                    </div>

                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                      {selectedProduct.name}
                    </h2>

                    <p className="mt-3 text-2xl font-semibold text-[#a78bfa]">
                      {formatPrice(selectedProduct.price)}
                    </p>

                    <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 h-5 w-5 text-[#d7d1ff]" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white/90">
                            Data do evento
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            Selecione a data desejada para continuar com a montagem do pedido.
                          </p>

                          <input
                            type="date"
                            value={selectedEventDate}
                            onChange={(e) => setSelectedEventDate(e.target.value)}
                            className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                          />

                          {selectedEventDate ? (
                            <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                              Data selecionada para consulta:{" "}
                              <span className="font-semibold text-white">
                                {formatDateLabel(selectedEventDate)}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-2xl border border-white/10 bg-[#121a2e] px-4 py-3 text-sm text-white/60">
                              Escolha uma data para seguir com o pedido.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-semibold text-white/90">
                        Descrição
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">
                        {selectedProduct.description ||
                          "Sem descrição detalhada cadastrada para este item."}
                      </p>
                    </div>

                    {company.delivery_enabled ? (
                      <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start gap-3">
                          <Truck className="mt-0.5 h-5 w-5 text-[#d7d1ff]" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white/90">
                              Como deseja receber?
                            </p>
                            <p className="mt-1 text-sm text-white/55">
                              Escolha se será retirada ou entrega.
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryMode("pickup");
                                  resetDeliveryCalculation();
                                }}
                                className={`inline-flex h-12 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                                  deliveryMode === "pickup"
                                    ? "border-white bg-white text-[#0b1018]"
                                    : "border-white/10 bg-[#121a2e] text-white"
                                }`}
                              >
                                Retirada
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryMode("delivery");
                                  resetDeliveryCalculation();
                                }}
                                className={`inline-flex h-12 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                                  deliveryMode === "delivery"
                                    ? "border-white bg-white text-[#0b1018]"
                                    : "border-white/10 bg-[#121a2e] text-white"
                                }`}
                              >
                                Entrega
                              </button>
                            </div>

                            {deliveryMode === "delivery" ? (
                              <>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <input
                                    type="text"
                                    value={checkoutAddress.zip_code}
                                    onChange={(e) =>
                                      updateCheckoutField(
                                        "zip_code",
                                        formatZipCode(e.target.value)
                                      )
                                    }
                                    onBlur={handleZipCodeBlur}
                                    placeholder="CEP"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white/45">
                                    Distância calculada automaticamente
                                  </div>

                                  <input
                                    type="text"
                                    value={checkoutAddress.address_line}
                                    onChange={(e) =>
                                      updateCheckoutField("address_line", e.target.value)
                                    }
                                    placeholder="Rua / avenida"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.address_number}
                                    onChange={(e) =>
                                      updateCheckoutField("address_number", e.target.value)
                                    }
                                    placeholder="Número"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.neighborhood}
                                    onChange={(e) =>
                                      updateCheckoutField("neighborhood", e.target.value)
                                    }
                                    placeholder="Bairro"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.city}
                                    onChange={(e) =>
                                      updateCheckoutField("city", e.target.value)
                                    }
                                    placeholder="Cidade"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.state}
                                    onChange={(e) =>
                                      updateCheckoutField("state", e.target.value.toUpperCase())
                                    }
                                    placeholder="Estado"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.reference}
                                    onChange={(e) =>
                                      updateCheckoutField("reference", e.target.value)
                                    }
                                    placeholder="Ponto de referência"
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />
                                </div>

                                {deliveryError ? (
                                  <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                      {deliveryError}
                                    </div>

                                    {deliveryPickupAddress ? (
                                      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                        <p className="font-semibold text-white">
                                          Retirada disponível
                                        </p>
                                        <p className="mt-1">
                                          Você pode retirar conosco neste endereço:
                                        </p>
                                        <p className="mt-2 font-medium text-white">
                                          {deliveryPickupAddress}
                                        </p>

                                        <div className="mt-3">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDeliveryMode("pickup");
                                              setDeliveryError("");
                                              setDeliveryPickupAddress("");
                                              setDeliveryFeeCalculated(false);
                                              setCalculatedDeliveryFee(0);
                                            }}
                                            className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-[#0b1018] transition hover:opacity-95"
                                          >
                                            Quero retirar no local
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={handleCalculateDelivery}
                                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-[#0b1018] transition hover:opacity-95"
                                  >
                                    {isCalculatingDelivery
                                      ? "Calculando..."
                                      : "Calcular frete"}
                                  </button>
                                </div>

                                {deliveryFeeCalculated ? (
                                  <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl border border-[#8b7cf6]/20 bg-[#8b7cf6]/10 px-4 py-3 text-sm text-[#d7d1ff]">
                                      Frete calculado:{" "}
                                      <span className="font-semibold text-white">
                                        {formatPrice(deliveryFee)}
                                      </span>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                                        Distância estimada:{" "}
                                        <span className="font-semibold text-white">
                                          {calculatedDistanceKm != null
                                            ? `${calculatedDistanceKm.toFixed(2)} km`
                                            : "—"}
                                        </span>
                                      </div>

                                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                                        Tempo estimado:{" "}
                                        <span className="font-semibold text-white">
                                          {calculatedDurationMinutes != null
                                            ? `${calculatedDurationMinutes} min`
                                            : "—"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                Você selecionou retirada. Não haverá cobrança de frete.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleAddToCartFromDetails(selectedProduct)}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#0b1018] transition hover:opacity-95"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Adicionar ao carrinho
                      </button>

                      <button
                        type="button"
                        onClick={openCheckoutModal}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#16c45b] px-5 text-sm font-semibold text-white transition hover:opacity-95"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Finalizar compra
                      </button>
                    </div>

                    <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            Adicione mais itens
                          </h3>
                          <p className="text-sm text-white/55">
                            Complete seu pedido com tapetes, painéis, cilindros e outros itens avulsos.
                          </p>
                        </div>
                      </div>

                      {buildKitProducts.filter((item) => item.id !== selectedProduct.id).length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-[#121a2e] px-4 py-5 text-sm text-white/60">
                          Nenhum item adicional disponível para esse tema no momento.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {buildKitProducts
                            .filter((item) => item.id !== selectedProduct.id)
                            .slice(0, 6)
                            .map((item) => (
                              <article
                                key={item.id}
                                className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0b1018]"
                              >
                                <div className="aspect-[1/1] overflow-hidden bg-[#121a2e]">
                                  {productMainImage(item) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={productMainImage(item)}
                                      alt={item.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-white/35">
                                      <Package2 className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>

                                <div className="p-3">
                                  <p className="line-clamp-2 text-sm font-semibold text-white">
                                    {item.name}
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-[#a78bfa]">
                                    {formatPrice(item.price)}
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() => handleAddToCartFromDetails(item)}
                                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                  >
                                    Adicionar ao pedido
                                  </button>
                                </div>
                              </article>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition ${
          cartOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition ${
            cartOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setCartOpen(false)}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-[430px] border-l border-white/10 bg-[#0a0f1c] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition duration-300 ${
            cartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Monte seu kit
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  Seu carrinho visual
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {cart.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-8 text-center">
                  <ShoppingBag className="mx-auto h-7 w-7 text-white/40" />
                  <p className="mt-4 text-lg font-semibold text-white">
                    Seu kit está vazio
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    Adicione itens e depois finalize tudo pelo WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const image = productMainImage(item.product);

                    return (
                      <div
                        key={item.product.id}
                        className="rounded-[24px] border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#121a2e]">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image}
                                alt={item.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package2 className="h-5 w-5 text-white/35" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 text-sm font-semibold text-white">
                              {item.product.name}
                            </h4>
                            <p className="mt-1 text-sm text-[#a78bfa]">
                              {formatPrice(item.product.price)}
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => decreaseItem(item.product.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>

                                <span className="min-w-[20px] text-center text-sm font-semibold text-white">
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => increaseItem(item.product.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItem(item.product.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 text-white/65" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                          Data do evento
                        </p>
                        <p className="mt-1 text-sm text-white/85">
                          {selectedEventDate || "Não informada"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {company.delivery_enabled ? (
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-4 w-4 text-white/65" />
                        <div className="w-full">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                            Recebimento
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDeliveryMode("pickup");
                                resetDeliveryCalculation();
                              }}
                              className={`inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                                deliveryMode === "pickup"
                                  ? "border-white bg-white text-[#0b1018]"
                                  : "border-white/10 bg-[#121a2e] text-white"
                              }`}
                            >
                              Retirada
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDeliveryMode("delivery");
                                resetDeliveryCalculation();
                              }}
                              className={`inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                                deliveryMode === "delivery"
                                  ? "border-white bg-white text-[#0b1018]"
                                  : "border-white/10 bg-[#121a2e] text-white"
                              }`}
                            >
                              Entrega
                            </button>
                          </div>

                          {deliveryMode === "delivery" ? (
                            <>
                              <div className="mt-3 grid gap-3">
                                <input
                                  type="text"
                                  value={checkoutAddress.zip_code}
                                  onChange={(e) =>
                                    updateCheckoutField(
                                      "zip_code",
                                      formatZipCode(e.target.value)
                                    )
                                  }
                                  onBlur={handleZipCodeBlur}
                                  placeholder="CEP"
                                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                />

                                <input
                                  type="text"
                                  value={checkoutAddress.address_line}
                                  onChange={(e) =>
                                    updateCheckoutField("address_line", e.target.value)
                                  }
                                  placeholder="Rua / avenida"
                                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    type="text"
                                    value={checkoutAddress.address_number}
                                    onChange={(e) =>
                                      updateCheckoutField("address_number", e.target.value)
                                    }
                                    placeholder="Número"
                                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.neighborhood}
                                    onChange={(e) =>
                                      updateCheckoutField("neighborhood", e.target.value)
                                    }
                                    placeholder="Bairro"
                                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    type="text"
                                    value={checkoutAddress.city}
                                    onChange={(e) =>
                                      updateCheckoutField("city", e.target.value)
                                    }
                                    placeholder="Cidade"
                                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />

                                  <input
                                    type="text"
                                    value={checkoutAddress.state}
                                    onChange={(e) =>
                                      updateCheckoutField("state", e.target.value.toUpperCase())
                                    }
                                    placeholder="Estado"
                                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                  />
                                </div>

                                <input
                                  type="text"
                                  value={checkoutAddress.reference}
                                  onChange={(e) =>
                                    updateCheckoutField("reference", e.target.value)
                                  }
                                  placeholder="Ponto de referência"
                                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                                />
                              </div>

                              {deliveryError ? (
                                <div className="mt-3 space-y-3">
                                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                    {deliveryError}
                                  </div>

                                  {deliveryPickupAddress ? (
                                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                      <p className="font-semibold text-white">
                                        Retirada disponível
                                      </p>
                                      <p className="mt-1">
                                        Você pode retirar conosco neste endereço:
                                      </p>
                                      <p className="mt-2 font-medium text-white">
                                        {deliveryPickupAddress}
                                      </p>

                                      <div className="mt-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDeliveryMode("pickup");
                                            setDeliveryError("");
                                            setDeliveryPickupAddress("");
                                            setDeliveryFeeCalculated(false);
                                            setCalculatedDeliveryFee(0);
                                          }}
                                          className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-[#0b1018] transition hover:opacity-95"
                                        >
                                          Quero retirar no local
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={handleCalculateDelivery}
                                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-[#0b1018] transition hover:opacity-95"
                                >
                                  {isCalculatingDelivery
                                    ? "Calculando..."
                                    : "Calcular frete"}
                                </button>
                              </div>

                              {deliveryFeeCalculated ? (
                                <div className="mt-3 space-y-3">
                                  <div className="rounded-2xl border border-[#8b7cf6]/20 bg-[#8b7cf6]/10 px-4 py-3 text-sm text-[#d7d1ff]">
                                    Frete calculado:{" "}
                                    <span className="font-semibold text-white">
                                      {formatPrice(deliveryFee)}
                                    </span>
                                  </div>

                                  <div className="grid gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                                      Distância estimada:{" "}
                                      <span className="font-semibold text-white">
                                        {calculatedDistanceKm != null
                                          ? `${calculatedDistanceKm.toFixed(2)} km`
                                          : "—"}
                                      </span>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                                      Tempo estimado:{" "}
                                      <span className="font-semibold text-white">
                                        {calculatedDurationMinutes != null
                                          ? `${calculatedDurationMinutes} min`
                                          : "—"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                              Pedido configurado para retirada.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">Itens</p>
                  <p className="text-sm font-semibold text-white">{cartCount}</p>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-white/60">Subtotal</p>
                  <p className="text-sm font-semibold text-white">
                    {formatPrice(productsSubtotal)}
                  </p>
                </div>

                {company.delivery_enabled && deliveryMode === "delivery" ? (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-white/60">Frete</p>
                    <p className="text-sm font-semibold text-white">
                      {deliveryFeeCalculated
                        ? formatPrice(deliveryFee)
                        : "Calcule o frete"}
                    </p>
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-white/60">Total final</p>
                  <p className="text-lg font-semibold text-white">
                    {formatPrice(totalWithDelivery)}
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={openCheckoutModal}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#16c45b] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,196,91,0.22)] transition hover:opacity-95"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Finalizar compra
                  </button>

                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    Limpar kit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <div
        className={`fixed inset-0 z-[70] transition ${
          checkoutModalOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* overlay */}
        <div
          className={`absolute inset-0 bg-black/60 transition ${
            checkoutModalOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeCheckoutModal}
        />

        {/* modal */}
        <div
          className={`absolute inset-0 flex items-center justify-center px-4 transition duration-300 ${
            checkoutModalOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#0b1018] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.40)]">
            
            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  Finalização do pedido
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-white">
                  Confirme seus dados
                </h3>
                <p className="mt-2 text-sm text-white/60">
                  Esses dados serão usados no fechamento do pedido.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckoutModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* form */}
            <div className="mt-6 grid gap-4">

              {/* nome */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/85">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#121a2e] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6f7dff] focus:ring-4 focus:ring-[#6f7dff]/10"
                />
              </div>

              {/* telefone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/85">
                  Celular
                </label>
                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#121a2e]">
                  <div className="inline-flex h-12 items-center border-r border-white/10 px-4 text-sm font-semibold text-white/75">
                    +55
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={checkoutPhone}
                    onChange={(e) =>
                      setCheckoutPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="DDD + número"
                    className="h-12 w-full bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35"
                  />
                </div>
              </div>

              {/* erro */}
              {checkoutFormError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {checkoutFormError}
                </div>
              ) : null}

              {/* resumo */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">Subtotal</p>
                  <p className="text-sm font-semibold text-white">
                    {formatPrice(productsSubtotal)}
                  </p>
                </div>

                {company?.delivery_enabled && deliveryMode === "delivery" ? (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-white/60">Frete</p>
                    <p className="text-sm font-semibold text-white">
                      {deliveryFeeCalculated
                        ? formatPrice(deliveryFee)
                        : "Não calculado"}
                    </p>
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-white/60">Total final</p>
                  <p className="text-lg font-semibold text-white">
                    {formatPrice(totalWithDelivery)}
                  </p>
                </div>
              </div>

              {/* botão final */}
              <button
                type="button"
                onClick={handleFinishCheckout}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#16c45b] px-5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Finalizar compra
              </button>

            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

function ProductCard({
  product,
  company,
  category,
  subcategory,
  onOpenDetails,
  compact = false,
  actionLabel = "Ver detalhes",
}: {
  product: Product;
  company: Company;
  category?: Category;
  subcategory?: Subcategory;
  onOpenDetails: (product: Product) => void;
  compact?: boolean;
  actionLabel?: string;
}) {
  const image = productMainImage(product);

  return (
    <article
      onClick={() => onOpenDetails(product)}
      className="group cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1018] shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-white/15"
    >
      <div className="relative aspect-[0.84/1] overflow-hidden bg-[#121a2e]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/35">
            <Package2 className="h-7 w-7" />
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap gap-2">
          {category ? (
            <span className="rounded-full bg-[#f59e0b]/15 px-2.5 py-1 text-[11px] font-semibold text-[#fbbf24]">
              {category.name}
            </span>
          ) : null}

          {subcategory ? (
            <span className="rounded-full bg-[#60a5fa]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93c5fd]">
              {subcategory.name}
            </span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold text-white sm:text-[15px]">
          {product.name}
        </h3>

        <p className="mt-2 line-clamp-2 min-h-[36px] text-xs leading-5 text-white/60 sm:text-sm">
          {product.description ||
            "Produto disponível para locação ou montagem sob consulta."}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">
              Valor
            </p>
            <p className="text-sm font-semibold text-[#a78bfa] sm:text-base">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(product);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 sm:px-4 sm:text-sm"
            >
              {actionLabel}
            </button>

            {!compact ? (
              <a
                href={buildWhatsAppUrl(
                  company.whatsapp,
                  `Olá! Tenho interesse no produto "${product.name}" da ${company.name}.`
                )}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-xs font-semibold text-[#0b1018] transition hover:opacity-95 sm:px-4 sm:text-sm"
              >
                Chamar
                <ChevronRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#0b1018] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/70">
        <Package2 className="h-6 w-6" />
      </div>
      <p className="mt-4 text-lg font-semibold text-white">
        Nenhum item encontrado
      </p>
      <p className="mt-2 text-sm text-white/60">
        Tente ajustar a busca, categoria ou tema selecionado.
      </p>
    </div>
  );
}