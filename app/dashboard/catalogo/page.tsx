"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Package2,
  Save,
  Search,
  Shapes,
  Store,
  Tag,
  Type,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompanyContext = {
  id: string;
  name: string;
  slug: string | null;
  public_link_enabled: boolean | null;
  public_logo_url: string | null;
  public_cover_url: string | null;
  public_link_title: string | null;
  public_link_subtitle: string | null;
  public_description: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email_publico: string | null;
  city: string | null;
  state: string | null;
  address_line: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  zip_code: string | null;
  maps_link: string | null;
  business_hours: string | null;
};

type Category = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active?: boolean | null;
};

type Subcategory = {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active?: boolean | null;
};

type Product = {
  id: string;
  company_id: string;
  category_id: string | null;
  subcategory_ids: string[] | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function buildCompanyAddress(company: CompanyContext | null) {
  if (!company) return "—";

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

function buildPublicUrl(slug?: string | null) {
  if (!slug) return "";
  if (typeof window !== "undefined") {
    return `${window.location.origin}/empresa/${slug}`;
  }
  return `/empresa/${slug}`;
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

export default function DecorCatalogoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });

  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] = useState({
    slug: "",
    public_link_enabled: true,
    public_logo_url: "",
    public_cover_url: "",
    public_link_title: "",
    public_link_subtitle: "",
    public_description: "",
    maps_link: "",
    business_hours: "",
  });

  useEffect(() => {
    loadCatalogData();
  }, []);

  async function loadCatalogData() {
    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setStatus({
          type: "error",
          message: "Não foi possível identificar o usuário logado.",
        });
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id, companies:company_id(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership?.company_id) {
        setStatus({
          type: "error",
          message: "Nenhuma empresa encontrada para este usuário.",
        });
        return;
      }

      const companyData = Array.isArray(membership.companies)
        ? membership.companies[0]
        : membership.companies;

      const resolvedCompany: CompanyContext = {
        id: companyData?.id,
        name: companyData?.name || "Minha empresa",
        slug: companyData?.slug || null,
        public_link_enabled: companyData?.public_link_enabled ?? false,
        public_logo_url: companyData?.public_logo_url || null,
        public_cover_url: companyData?.public_cover_url || null,
        public_link_title: companyData?.public_link_title || null,
        public_link_subtitle: companyData?.public_link_subtitle || null,
        public_description: companyData?.public_description || null,
        whatsapp: companyData?.whatsapp || null,
        instagram: companyData?.instagram || null,
        email_publico: companyData?.email_publico || null,
        city: companyData?.city || null,
        state: companyData?.state || null,
        address_line: companyData?.address_line || null,
        address_number: companyData?.address_number || null,
        address_complement: companyData?.address_complement || null,
        neighborhood: companyData?.neighborhood || null,
        zip_code: companyData?.zip_code || null,
        maps_link: companyData?.maps_link || null,
        business_hours: companyData?.business_hours || null,
      };

      setCompany(resolvedCompany);

      setForm({
        slug: resolvedCompany.slug || "",
        public_link_enabled: !!resolvedCompany.public_link_enabled,
        public_logo_url: resolvedCompany.public_logo_url || "",
        public_cover_url: resolvedCompany.public_cover_url || "",
        public_link_title: resolvedCompany.public_link_title || "",
        public_link_subtitle: resolvedCompany.public_link_subtitle || "",
        public_description: resolvedCompany.public_description || "",
        maps_link: resolvedCompany.maps_link || "",
        business_hours: resolvedCompany.business_hours || "",
      });

      const [categoriesRes, subcategoriesRes, productsRes] = await Promise.all([
        supabase
          .from("decor_categories")
          .select("id, company_id, name, slug, sort_order, is_active")
          .eq("company_id", resolvedCompany.id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("decor_subcategories")
          .select("id, company_id, category_id, name, slug, sort_order, is_active")
          .eq("company_id", resolvedCompany.id)
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
            is_active,
            is_featured
          `)
          .eq("company_id", resolvedCompany.id)
          .order("created_at", { ascending: false }),
      ]);

      setCategories((categoriesRes.data || []) as Category[]);
      setSubcategories((subcategoriesRes.data || []) as Subcategory[]);
      setProducts((productsRes.data || []) as Product[]);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar o catálogo.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!company?.id) return;

    const finalSlug = normalizeSlug(form.slug);

    if (!finalSlug) {
      setStatus({
        type: "error",
        message: "Informe um slug válido para o catálogo público.",
      });
      return;
    }

    try {
      setSaving(true);
      setStatus({ type: "", message: "" });

      const { error } = await supabase
        .from("companies")
        .update({
          slug: finalSlug,
          public_link_enabled: form.public_link_enabled,
          public_logo_url: form.public_logo_url.trim() || null,
          public_cover_url: form.public_cover_url.trim() || null,
          public_link_title: form.public_link_title.trim() || null,
          public_link_subtitle: form.public_link_subtitle.trim() || null,
          public_description: form.public_description.trim() || null,
          maps_link: form.maps_link.trim() || null,
          business_hours: form.business_hours.trim() || null,
        })
        .eq("id", company.id);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível salvar as configurações do catálogo.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Catálogo atualizado com sucesso.",
      });

      await loadCatalogData();
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyPublicUrl() {
    const url = buildPublicUrl(normalizeSlug(form.slug));
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setStatus({
        type: "success",
        message: "Link público copiado com sucesso.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Não foi possível copiar o link público.",
      });
    }
  }

  const publicUrl = buildPublicUrl(normalizeSlug(form.slug));

  const stats = useMemo(() => {
    const activeCategories = categories.filter((item) => item.is_active !== false).length;
    const activeSubcategories = subcategories.filter((item) => item.is_active !== false).length;
    const activeProducts = products.filter((item) => item.is_active !== false).length;
    const featuredProducts = products.filter((item) => item.is_featured === true).length;
    const averagePrice =
      activeProducts > 0
        ? products
            .filter((item) => item.is_active !== false)
            .reduce((acc, item) => acc + Number(item.price || 0), 0) / activeProducts
        : 0;

    return {
      activeCategories,
      activeSubcategories,
      activeProducts,
      featuredProducts,
      averagePrice,
    };
  }, [categories, subcategories, products]);

  const previewProducts = useMemo(() => {
    return products
      .filter((item) => item.is_active !== false)
      .slice(0, 6);
  }, [products]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando catálogo...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1760px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  DecorFlow
                </div>
                <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Catálogo
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                  Central do catálogo público da sua empresa: link, identidade visual, textos, presença online e visão geral do que já está publicado.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Empresa</p>
                <p>{company?.name || "Minha empresa"}</p>
              </div>
            </div>

            {status.message ? (
              <div
                className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                icon={<Shapes className="h-5 w-5" />}
                label="Categorias ativas"
                value={String(stats.activeCategories)}
                tone="slate"
              />
              <MetricCard
                icon={<Tag className="h-5 w-5" />}
                label="Subcategorias"
                value={String(stats.activeSubcategories)}
                tone="blue"
              />
              <MetricCard
                icon={<Package2 className="h-5 w-5" />}
                label="Produtos ativos"
                value={String(stats.activeProducts)}
                tone="emerald"
              />
              <MetricCard
                icon={<Store className="h-5 w-5" />}
                label="Produtos em destaque"
                value={String(stats.featuredProducts)}
                tone="amber"
              />
              <MetricCard
                icon={<Search className="h-5 w-5" />}
                label="Preço médio"
                value={formatCurrency(stats.averagePrice)}
                tone="rose"
              />
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="border-b border-slate-200 xl:border-b-0 xl:border-r">
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="space-y-5">
                  <BlockCard
                    title="Presença pública"
                    subtitle="Controle do link público, slug e identidade principal."
                    icon={<Globe className="h-5 w-5 text-slate-700" />}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ToggleCard
                        title="Catálogo público"
                        description="Ativa ou desativa o link público da empresa."
                        checked={form.public_link_enabled}
                        onChange={(checked) =>
                          setForm((prev) => ({ ...prev, public_link_enabled: checked }))
                        }
                      />

                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Link público
                        </p>
                        <p className="mt-2 break-all text-sm text-slate-500">
                          {publicUrl || "Informe um slug para gerar o link"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleCopyPublicUrl}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar link
                          </button>

                          {publicUrl ? (
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Abrir catálogo
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Slug público"
                        value={form.slug}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            slug: normalizeSlug(value),
                          }))
                        }
                        placeholder="Ex: decoracoes-flow"
                      />

                      <Input
                        label="Título público"
                        value={form.public_link_title}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, public_link_title: value }))
                        }
                        placeholder="Ex: Decorações Flow"
                      />
                    </div>

                    <div className="mt-4">
                      <Input
                        label="Subtítulo público"
                        value={form.public_link_subtitle}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, public_link_subtitle: value }))
                        }
                        placeholder="Ex: Temas, kits e itens para festas e eventos"
                      />
                    </div>

                    <div className="mt-4">
                      <Textarea
                        label="Descrição pública"
                        value={form.public_description}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, public_description: value }))
                        }
                        placeholder="Descreva sua empresa, diferenciais, tipos de evento atendidos, etc."
                      />
                    </div>
                  </BlockCard>

                  <BlockCard
                    title="Identidade visual"
                    subtitle="Logo e capa do catálogo público."
                    icon={<ImageIcon className="h-5 w-5 text-slate-700" />}
                  >
                    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                      <div>
                        <Input
                          label="URL da logo"
                          value={form.public_logo_url}
                          onChange={(value) =>
                            setForm((prev) => ({ ...prev, public_logo_url: value }))
                          }
                          placeholder="Cole a URL da logo"
                        />

                        <div className="mt-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                          <CompanyMedia
                            src={form.public_logo_url}
                            alt={company?.name || "Logo"}
                            className="h-full w-full object-cover"
                            fallback={
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Input
                          label="URL da capa"
                          value={form.public_cover_url}
                          onChange={(value) =>
                            setForm((prev) => ({ ...prev, public_cover_url: value }))
                          }
                          placeholder="Cole a URL da imagem de capa"
                        />

                        <div className="mt-4 h-28 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                          <CompanyMedia
                            src={form.public_cover_url}
                            alt={company?.name || "Capa"}
                            className="h-full w-full object-cover"
                            fallback={
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </BlockCard>

                  <BlockCard
                    title="Contato e presença"
                    subtitle="Informações que fortalecem a página pública."
                    icon={<Link2 className="h-5 w-5 text-slate-700" />}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ReadOnlyField
                        label="WhatsApp"
                        value={company?.whatsapp || "—"}
                      />
                      <ReadOnlyField
                        label="Instagram"
                        value={company?.instagram || "—"}
                      />
                      <ReadOnlyField
                        label="E-mail público"
                        value={company?.email_publico || "—"}
                      />
                      <ReadOnlyField
                        label="Cidade / Estado"
                        value={
                          [company?.city, company?.state].filter(Boolean).join(" - ") || "—"
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <Input
                        label="Link do Google Maps"
                        value={form.maps_link}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, maps_link: value }))
                        }
                        placeholder="Cole o link do Google Maps"
                      />
                    </div>

                    <div className="mt-4">
                      <Textarea
                        label="Horário de funcionamento"
                        value={form.business_hours}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, business_hours: value }))
                        }
                        placeholder={"Ex:\nSeg a Sex: 08h às 18h\nSábado: 08h às 13h"}
                        rows={4}
                      />
                    </div>

                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Endereço atual da empresa
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {buildCompanyAddress(company)}
                      </p>
                    </div>
                  </BlockCard>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar catálogo
                    </button>

                    {publicUrl ? (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver página pública
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <aside className="p-4 sm:p-5 lg:p-6">
              <div className="space-y-5">
                <BlockCard
                  title="Resumo do catálogo"
                  subtitle="Tudo o que já existe publicado na sua vitrine."
                  icon={<Store className="h-5 w-5 text-slate-700" />}
                >
                  <div className="space-y-3">
                    <InfoRow label="Categorias ativas" value={String(stats.activeCategories)} />
                    <InfoRow label="Subcategorias" value={String(stats.activeSubcategories)} />
                    <InfoRow label="Produtos ativos" value={String(stats.activeProducts)} />
                    <InfoRow label="Produtos em destaque" value={String(stats.featuredProducts)} />
                    <InfoRow label="Preço médio" value={formatCurrency(stats.averagePrice)} />
                  </div>
                </BlockCard>

                <BlockCard
                  title="Prévia visual"
                  subtitle="Como sua empresa aparece na presença pública."
                  icon={<Globe className="h-5 w-5 text-slate-700" />}
                >
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                    <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                      <CompanyMedia
                        src={form.public_cover_url}
                        alt={company?.name || "Capa"}
                        className="h-full w-full object-cover"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        }
                      />
                    </div>

                    <div className="px-4 pb-4">
                      <div className="-mt-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border-4 border-white bg-slate-100 shadow-sm">
                        <CompanyMedia
                          src={form.public_logo_url}
                          alt={company?.name || "Logo"}
                          className="h-full w-full object-cover"
                          fallback={
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <Store className="h-5 w-5" />
                            </div>
                          }
                        />
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-slate-950">
                        {form.public_link_title || company?.name || "Minha empresa"}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {form.public_link_subtitle ||
                          "Seu catálogo público aparecerá aqui com uma apresentação mais comercial."}
                      </p>

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">
                        {form.public_description ||
                          "Adicione uma descrição pública para deixar sua página mais forte e profissional."}
                      </p>
                    </div>
                  </div>
                </BlockCard>

                <BlockCard
                  title="Produtos na vitrine"
                  subtitle="Prévia rápida dos primeiros itens ativos."
                  icon={<Package2 className="h-5 w-5 text-slate-700" />}
                >
                  {previewProducts.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      Você ainda não tem produtos ativos suficientes para exibir na prévia.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {previewProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-200">
                            <CompanyMedia
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              fallback={
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <Package2 className="h-4 w-4" />
                                </div>
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {product.slug}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(product.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </BlockCard>

                <BlockCard
                  title="Presença pública"
                  subtitle="Checklist para o catálogo ficar forte."
                  icon={<MapPin className="h-5 w-5 text-slate-700" />}
                >
                  <div className="space-y-3">
                    <ChecklistItem
                      ok={!!form.slug}
                      label="Slug configurado"
                    />
                    <ChecklistItem
                      ok={!!form.public_link_enabled}
                      label="Link público ativado"
                    />
                    <ChecklistItem
                      ok={!!form.public_logo_url}
                      label="Logo pública definida"
                    />
                    <ChecklistItem
                      ok={!!form.public_cover_url}
                      label="Capa pública definida"
                    />
                    <ChecklistItem
                      ok={!!form.public_link_title}
                      label="Título público preenchido"
                    />
                    <ChecklistItem
                      ok={!!form.public_description}
                      label="Descrição pública preenchida"
                    />
                    <ChecklistItem
                      ok={!!company?.whatsapp}
                      label="WhatsApp disponível"
                    />
                    <ChecklistItem
                      ok={!!company?.address_line}
                      label="Endereço configurado"
                    />
                    <ChecklistItem
                      ok={stats.activeProducts > 0}
                      label="Produtos ativos cadastrados"
                    />
                  </div>
                </BlockCard>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "slate" | "blue" | "emerald" | "amber" | "rose";
}) {
  const toneMap = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneMap[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

function BlockCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
            checked ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900 break-all">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ChecklistItem({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
        }`}
      >
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}