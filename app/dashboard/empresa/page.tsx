"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Globe,
  AtSign,
  Link2,
  MapPin,
  Phone,
  Save,
  Sparkles,
  Store,
  Image as ImageIcon,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Upload,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompanyForm = {
  id: string;
  name: string;
  instagram: string;
  whatsapp: string;
  email_publico: string;
  address_line: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  slug: string;
  public_description: string;
  public_logo_url: string;
  public_cover_url: string;
  public_link_enabled: boolean;
  public_link_title: string;
  public_link_subtitle: string;
  business_hours: string;
  maps_link: string;
  delivery_enabled: boolean;
  delivery_price_per_km: string;
  delivery_minimum_fee: string;
  delivery_round_trip_multiplier: string;
  delivery_max_distance_km: string;
};

const initialForm: CompanyForm = {
  id: "",
  name: "",
  instagram: "",
  whatsapp: "",
  email_publico: "",
  address_line: "",
  address_number: "",
  address_complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
  slug: "",
  public_description: "",
  public_logo_url: "",
  public_cover_url: "",
  public_link_enabled: false,
  public_link_title: "",
  public_link_subtitle: "",
  business_hours: "",
  maps_link: "",
  delivery_enabled: false,
  delivery_price_per_km: "1.40",
  delivery_minimum_fee: "0",
  delivery_round_trip_multiplier: "4",
  delivery_max_distance_km: "10",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatWhatsapp(value: string) {
  return value.replace(/\D/g, "");
}

export default function EmpresaPage() {
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [uploadingLogo, setUploadingLogo] = useState(false);
const [uploadingCover, setUploadingCover] = useState(false);
const [status, setStatus] = useState<{
  type: "success" | "error" | "";
  message: string;
}>({
  type: "",
  message: "",
});

  const publicBaseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const publicLink = useMemo(() => {
    if (!form.slug || !publicBaseUrl) return "";
    return `${publicBaseUrl}/empresa/${form.slug}`;
  }, [form.slug, publicBaseUrl]);

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
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
        setLoading(false);
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership?.company_id) {
        setStatus({
          type: "error",
          message: "Nenhuma empresa encontrada para este usuário.",
        });
        setLoading(false);
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select(
          `
            id,
            name,
            instagram,
            whatsapp,
            email_publico,
            address_line,
            address_number,
            address_complement,
            neighborhood,
            city,
            state,
            zip_code,
            slug,
            public_description,
            public_logo_url,
            public_cover_url,
            public_link_enabled,
            public_link_title,
            public_link_subtitle,
            business_hours,
            maps_link,
            delivery_enabled,
            delivery_price_per_km,
            delivery_minimum_fee,
            delivery_round_trip_multiplier,
            delivery_max_distance_km
          `
        )
        .eq("id", membership.company_id)
        .single();

      if (companyError || !company) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os dados da empresa.",
        });
        setLoading(false);
        return;
      }

      setForm({
        id: company.id ?? "",
        name: company.name ?? "",
        instagram: company.instagram ?? "",
        whatsapp: company.whatsapp ?? "",
        email_publico: company.email_publico ?? "",
        address_line: company.address_line ?? "",
        address_number: company.address_number ?? "",
        address_complement: company.address_complement ?? "",
        neighborhood: company.neighborhood ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        zip_code: company.zip_code ?? "",
        slug: company.slug ?? slugify(company.name ?? ""),
        public_description: company.public_description ?? "",
        public_logo_url: company.public_logo_url ?? "",
        public_cover_url: company.public_cover_url ?? "",
        public_link_enabled: company.public_link_enabled ?? false,
        public_link_title: company.public_link_title ?? "",
        public_link_subtitle: company.public_link_subtitle ?? "",
        business_hours: company.business_hours ?? "",
        maps_link: company.maps_link ?? "",
        delivery_enabled: company.delivery_enabled ?? false,
        delivery_price_per_km:
          company.delivery_price_per_km != null
            ? String(company.delivery_price_per_km)
            : "1.40",
        delivery_minimum_fee:
          company.delivery_minimum_fee != null
            ? String(company.delivery_minimum_fee)
            : "0",
        delivery_round_trip_multiplier:
          company.delivery_round_trip_multiplier != null
            ? String(company.delivery_round_trip_multiplier)
            : "4",
        delivery_max_distance_km:
          company.delivery_max_distance_km != null
            ? String(company.delivery_max_distance_km)
            : "10",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar a empresa.",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof CompanyForm>(
    field: K,
    value: CompanyForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function uploadCompanyImage(
  file: File,
  type: "logo" | "cover"
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !form.id) {
      setStatus({
        type: "error",
        message: "Não foi possível identificar a empresa para envio da imagem.",
      });
      return null;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${form.id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      setStatus({
        type: "error",
        message: "Não foi possível enviar a imagem.",
      });
      return null;
    }

    const { data } = supabase.storage
      .from("company-assets")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch {
    setStatus({
      type: "error",
      message: "Ocorreu um erro inesperado ao enviar a imagem.",
    });
    return null;
  }
}

async function handleImageUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  type: "logo" | "cover"
) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setStatus({
      type: "error",
      message: "Selecione um arquivo de imagem válido.",
    });
    e.target.value = "";
    return;
  }

  if (!form.id) {
    setStatus({
      type: "error",
      message: "Empresa inválida para vincular a imagem.",
    });
    e.target.value = "";
    return;
  }

  try {
    if (type === "logo") setUploadingLogo(true);
    if (type === "cover") setUploadingCover(true);

    const uploadedUrl = await uploadCompanyImage(file, type);

    if (!uploadedUrl) {
      return;
    }

    const patch =
      type === "logo"
        ? { public_logo_url: uploadedUrl }
        : { public_cover_url: uploadedUrl };

    const { error: updateError } = await supabase
      .from("companies")
      .update(patch)
      .eq("id", form.id);

    if (updateError) {
      setStatus({
        type: "error",
        message:
          type === "logo"
            ? "A logo foi enviada, mas não foi salva na empresa."
            : "A capa foi enviada, mas não foi salva na empresa.",
      });
      return;
    }

    if (type === "logo") {
      updateField("public_logo_url", uploadedUrl);
    } else {
      updateField("public_cover_url", uploadedUrl);
    }

    setStatus({
      type: "success",
      message:
        type === "logo"
          ? "Logo enviada e salva com sucesso."
          : "Capa enviada e salva com sucesso.",
    });
  } catch {
    setStatus({
      type: "error",
      message:
        type === "logo"
          ? "Ocorreu um erro ao processar a logo."
          : "Ocorreu um erro ao processar a capa.",
    });
  } finally {
    if (type === "logo") setUploadingLogo(false);
    if (type === "cover") setUploadingCover(false);
    e.target.value = "";
  }
}

function removeImage(type: "logo" | "cover") {
  if (type === "logo") {
    updateField("public_logo_url", "");
  } else {
    updateField("public_cover_url", "");
  }
}

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.id) {
      setStatus({
        type: "error",
        message: "Empresa inválida para salvar.",
      });
      return;
    }

    if (!form.name.trim()) {
      setStatus({
        type: "error",
        message: "Informe o nome da empresa.",
      });
      return;
    }

    if (!form.slug.trim()) {
      setStatus({
        type: "error",
        message: "Informe o slug do link público.",
      });
      return;
    }

    try {
      setSaving(true);
      setStatus({ type: "", message: "" });

      const cleanSlug = slugify(form.slug);
      const cleanWhatsapp = formatWhatsapp(form.whatsapp);

      const { data: slugConflict, error: slugCheckError } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", cleanSlug)
        .neq("id", form.id)
        .maybeSingle();

      if (slugCheckError) {
        setStatus({
          type: "error",
          message: "Não foi possível validar o slug público.",
        });
        setSaving(false);
        return;
      }

      if (slugConflict) {
        setStatus({
          type: "error",
          message: "Esse link público já está em uso. Escolha outro slug.",
        });
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        instagram: form.instagram.trim(),
        whatsapp: cleanWhatsapp,
        email_publico: form.email_publico.trim(),
        address_line: form.address_line.trim(),
        address_number: form.address_number.trim(),
        address_complement: form.address_complement.trim(),
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip_code: form.zip_code.trim(),
        slug: cleanSlug,
        public_description: form.public_description.trim(),
        public_logo_url: form.public_logo_url.trim(),
        public_cover_url: form.public_cover_url.trim(),
        public_link_enabled: form.public_link_enabled,
        public_link_title: form.public_link_title.trim(),
        public_link_subtitle: form.public_link_subtitle.trim(),
        business_hours: form.business_hours.trim(),
        maps_link: form.maps_link.trim(),
        delivery_enabled: form.delivery_enabled,
        delivery_price_per_km: Number(form.delivery_price_per_km || 0),
        delivery_minimum_fee: Number(form.delivery_minimum_fee || 0),
        delivery_round_trip_multiplier: Number(
          form.delivery_round_trip_multiplier || 4
        ),
        delivery_max_distance_km: Number(form.delivery_max_distance_km || 10),
      };

      const { error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível salvar os dados da empresa.",
        });
        setSaving(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        slug: cleanSlug,
        whatsapp: cleanWhatsapp,
      }));

      setStatus({
        type: "success",
        message: "Dados da empresa salvos com sucesso.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao salvar.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function copyPublicLink() {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
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

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados da empresa...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-indigo-100 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Empresa e presença pública
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              Configure a identidade da sua empresa
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Aqui você ajusta os dados principais da empresa, presença pública,
              endereço, contato e o link público que depois pode virar a landing
              page oficial da sua operação.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Empresa
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {form.name || "Sem nome definido"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Link público
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {form.public_link_enabled ? "Ativo" : "Desativado"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {status.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-start gap-3">
            {status.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Dados principais
                  </h2>
                  <p className="text-sm text-slate-500">
                    Informações centrais da empresa.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Nome da empresa"
                  value={form.name}
                  onChange={(value) => {
                    updateField("name", value);
                    if (!form.slug || form.slug === slugify(form.name)) {
                      updateField("slug", slugify(value));
                    }
                  }}
                  placeholder="Ex: DecorFlow Studio"
                  required
                />

                    <Field
                    label="Instagram"
                    value={form.instagram}
                    onChange={(value) => updateField("instagram", value)}
                    placeholder="@suaempresa"
                    icon={AtSign}
                    />

                <Field
                  label="WhatsApp"
                  value={form.whatsapp}
                  onChange={(value) => updateField("whatsapp", value)}
                  placeholder="62999999999"
                  icon={Phone}
                />

                <Field
                  label="E-mail público"
                  value={form.email_publico}
                  onChange={(value) => updateField("email_publico", value)}
                  placeholder="contato@suaempresa.com"
                  icon={Mail}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Endereço e localização
                  </h2>
                  <p className="text-sm text-slate-500">
                    Endereço comercial e link do mapa.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Rua / avenida"
                  value={form.address_line}
                  onChange={(value) => updateField("address_line", value)}
                  placeholder="Ex: Avenida Central"
                />

                <Field
                  label="Número"
                  value={form.address_number}
                  onChange={(value) => updateField("address_number", value)}
                  placeholder="Ex: 120"
                />

                <Field
                  label="Complemento"
                  value={form.address_complement}
                  onChange={(value) => updateField("address_complement", value)}
                  placeholder="Sala, loja, bloco..."
                />

                <Field
                  label="Bairro"
                  value={form.neighborhood}
                  onChange={(value) => updateField("neighborhood", value)}
                  placeholder="Ex: Setor Bueno"
                />

                <Field
                  label="Cidade"
                  value={form.city}
                  onChange={(value) => updateField("city", value)}
                  placeholder="Ex: Goiânia"
                />

                <Field
                  label="Estado"
                  value={form.state}
                  onChange={(value) => updateField("state", value)}
                  placeholder="Ex: GO"
                />

                <Field
                  label="CEP"
                  value={form.zip_code}
                  onChange={(value) => updateField("zip_code", value)}
                  placeholder="Ex: 74000-000"
                />

                <Field
                  label="Link do Google Maps"
                  value={form.maps_link}
                  onChange={(value) => updateField("maps_link", value)}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

                              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Entrega e logística
                  </h2>
                  <p className="text-sm text-slate-500">
                    Configure o cálculo base de entrega para eventos e locações.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Ativar cálculo de entrega
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Quando ativado, o catálogo poderá calcular a entrega com base no endereço do cliente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateField("delivery_enabled", !form.delivery_enabled)
                      }
                      className={`relative inline-flex h-11 w-[76px] items-center rounded-full px-1 transition ${
                        form.delivery_enabled ? "bg-slate-950" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-9 w-9 rounded-full bg-white shadow-sm transition ${
                          form.delivery_enabled
                            ? "translate-x-[30px]"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="Valor por km"
                    value={form.delivery_price_per_km}
                    onChange={(value) =>
                      updateField(
                        "delivery_price_per_km",
                        value.replace(",", ".")
                      )
                    }
                    placeholder="1.40"
                  />

                  <Field
                    label="Taxa mínima"
                    value={form.delivery_minimum_fee}
                    onChange={(value) =>
                      updateField(
                        "delivery_minimum_fee",
                        value.replace(",", ".")
                      )
                    }
                    placeholder="0"
                  />

                  <Field
                    label="Multiplicador logístico"
                    value={form.delivery_round_trip_multiplier}
                    onChange={(value) =>
                      updateField(
                        "delivery_round_trip_multiplier",
                        value.replace(/\D/g, "")
                      )
                    }
                    placeholder="4"
                  />

                  <Field
                    label="Limite máximo de entrega (km)"
                    value={form.delivery_max_distance_km}
                    onChange={(value) =>
                      updateField(
                        "delivery_max_distance_km",
                        value.replace(/[^\d.,]/g, "").replace(",", ".")
                      )
                    }
                    placeholder="10"
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Regra sugerida para seu caso: ida + volta + buscar + volta novamente = multiplicador 4. Você também pode limitar a operação, por exemplo, para até 10 km de entrega.
                </div>
              </div>
            </div>


            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Página pública e landing
                  </h2>
                  <p className="text-sm text-slate-500">
                    Estrutura da futura landing pública da empresa.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Slug público"
                  value={form.slug}
                  onChange={(value) => updateField("slug", slugify(value))}
                  placeholder="decorflow-studio"
                  icon={Link2}
                  required
                />

                <Field
                  label="Título público"
                  value={form.public_link_title}
                  onChange={(value) => updateField("public_link_title", value)}
                  placeholder="Ex: Sua empresa de decoração premium"
                />

                <div className="md:col-span-2">
                  <Field
                    label="Subtítulo público"
                    value={form.public_link_subtitle}
                    onChange={(value) => updateField("public_link_subtitle", value)}
                    placeholder="Ex: Festas, personalizados, locações e experiências únicas"
                  />
                </div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Descrição pública"
                    value={form.public_description}
                    onChange={(value) => updateField("public_description", value)}
                    placeholder="Descreva sua empresa, diferenciais, serviços e posicionamento..."
                  />
                </div>

<div className="space-y-2">
  <label className="text-sm font-medium text-slate-700">
    Logo pública
  </label>

  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {form.public_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.public_logo_url}
            alt="Logo pública"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-slate-400" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          {uploadingLogo ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Importar logo
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e, "logo")}
          />
        </label>

        {form.public_logo_url ? (
          <button
            type="button"
            onClick={() => removeImage("logo")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Remover logo
          </button>
        ) : null}
      </div>
    </div>
  </div>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium text-slate-700">
    Capa pública
  </label>

  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-col gap-4">
      <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {form.public_cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.public_cover_url}
            alt="Capa pública"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-slate-400" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          {uploadingCover ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Importar capa
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e, "cover")}
          />
        </label>

        {form.public_cover_url ? (
          <button
            type="button"
            onClick={() => removeImage("cover")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Remover capa
          </button>
        ) : null}
      </div>
    </div>
  </div>
</div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Horário de funcionamento"
                    value={form.business_hours}
                    onChange={(value) => updateField("business_hours", value)}
                    placeholder={`Ex:
Seg a Sex: 08:00 às 18:00
Sábado: 08:00 às 13:00`}
                    rows={4}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Ativar página pública
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Quando ativado, esse link poderá virar sua landing pública padrão.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateField("public_link_enabled", !form.public_link_enabled)
                    }
                    className={`relative inline-flex h-11 w-[76px] items-center rounded-full px-1 transition ${
                      form.public_link_enabled ? "bg-slate-950" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-9 w-9 rounded-full bg-white shadow-sm transition ${
                        form.public_link_enabled ? "translate-x-[30px]" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Preview da empresa
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visual rápido da presença pública.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50">
                <div className="h-36 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700">
                  {form.public_cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.public_cover_url}
                      alt="Capa pública"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="relative px-5 pb-5">
                  <div className="-mt-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
                    {form.public_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.public_logo_url}
                        alt="Logo pública"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-900">
                        {form.name ? form.name.slice(0, 2).toUpperCase() : "DF"}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-slate-950">
                    {form.public_link_title || form.name || "Sua empresa"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {form.public_link_subtitle ||
                      "Sua página pública vai aparecer aqui de forma mais profissional."}
                  </p>

                  <div className="mt-4 grid gap-2">
                    {form.instagram ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        Instagram: {form.instagram}
                      </div>
                    ) : null}

                    {form.whatsapp ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        WhatsApp: {form.whatsapp}
                      </div>
                    ) : null}

                    {form.city || form.state ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        {form.city}
                        {form.city && form.state ? " - " : ""}
                        {form.state}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Link público
                  </h2>
                  <p className="text-sm text-slate-500">
                    Endereço da futura landing pública.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  URL pública
                </p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">
                  {publicLink || "Defina um slug para gerar o link público"}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={copyPublicLink}
                    disabled={!publicLink}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </button>

                  <a
                    href={publicLink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 ${
                      !publicLink ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir link
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Salvar alterações
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Salve os dados da empresa para alinhar o sistema, identidade
                pública e futuras páginas da operação.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar empresa
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  icon: Icon,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 ${
            Icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: TextAreaFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
      />
    </div>
  );
}