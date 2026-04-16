"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  AtSign,
  Phone,
  Mail,
  MapPin,
  Link2,
  Globe,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Store,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type BusinessDay = {
  enabled: boolean;
  is24h: boolean;
  open: string;
  close: string;
  lunchStart: string;
  lunchEnd: string;
};

type OnboardingForm = {
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
  public_link_title: string;
  public_link_subtitle: string;
  business_hours: string;
  maps_link: string;
  business_schedule: {
    monday: BusinessDay;
    tuesday: BusinessDay;
    wednesday: BusinessDay;
    thursday: BusinessDay;
    friday: BusinessDay;
    saturday: BusinessDay;
    sunday: BusinessDay;
  };
};

const emptyBusinessDay = (): BusinessDay => ({
  enabled: true,
  is24h: false,
  open: "",
  close: "",
  lunchStart: "",
  lunchEnd: "",
});

const initialForm: OnboardingForm = {
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
  public_link_title: "",
  public_link_subtitle: "",
  business_hours: "",
  maps_link: "",
  business_schedule: {
    monday: emptyBusinessDay(),
    tuesday: emptyBusinessDay(),
    wednesday: emptyBusinessDay(),
    thursday: emptyBusinessDay(),
    friday: emptyBusinessDay(),
    saturday: emptyBusinessDay(),
    sunday: {
      enabled: false,
      is24h: false,
      open: "",
      close: "",
      lunchStart: "",
      lunchEnd: "",
    },
  },
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function OnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
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
    validateAccess();
  }, []);

  async function validateAccess() {
    try {
      setChecking(true);
      setStatus({ type: "", message: "" });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membershipError && membership?.company_id) {
        router.replace("/dashboard/empresa");
        return;
      }
    } finally {
      setChecking(false);
    }
  }

  function updateField<K extends keyof OnboardingForm>(
    field: K,
    value: OnboardingForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateBusinessDay(
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday",
  field: keyof BusinessDay,
  value: boolean | string
) {
  setForm((prev) => ({
    ...prev,
    business_schedule: {
      ...prev.business_schedule,
      [day]: {
        ...prev.business_schedule[day],
        [field]: value,
      },
    },
  }));
}

  async function handleCepChange(value: string) {
    const formatted = formatCep(value);
    updateField("zip_code", formatted);

    const cep = onlyDigits(value);
    if (cep.length !== 8) return;

    try {
      setLoadingCep(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) return;

      setForm((prev) => ({
        ...prev,
        zip_code: formatted,
        address_line: data.logradouro || prev.address_line,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setLoadingCep(false);
    }
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1) {
      if (!form.name.trim()) {
        setStatus({
          type: "error",
          message: "Informe o nome da empresa para continuar.",
        });
        return false;
      }

      if (!form.whatsapp.trim()) {
        setStatus({
          type: "error",
          message: "Informe o WhatsApp da empresa para continuar.",
        });
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.city.trim() || !form.state.trim()) {
        setStatus({
          type: "error",
          message: "Preencha cidade e estado para continuar.",
        });
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.slug.trim()) {
        setStatus({
          type: "error",
          message: "Informe o slug do link público para continuar.",
        });
        return false;
      }
    }

    setStatus({ type: "", message: "" });
    return true;
  }

  function handleNextStep() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function handlePrevStep() {
    setStatus({ type: "", message: "" });
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus({
          type: "error",
          message: "Sessão inválida. Faça login novamente.",
        });
        setSaving(false);
        return;
      }

      const cleanSlug = slugify(form.slug);
      const cleanWhatsapp = onlyDigits(form.whatsapp);

      const scheduleLabels = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
} as const;

const businessHoursText = (
  Object.entries(form.business_schedule) as Array<
    [
      keyof typeof form.business_schedule,
      (typeof form.business_schedule)[keyof typeof form.business_schedule]
    ]
  >
)
  .filter(([, day]) => day.enabled)
  .map(([key, day]) => {
    if (day.is24h) {
      return `${scheduleLabels[key]}: 24 horas`;
    }

    const openClose =
      day.open && day.close ? `${day.open} às ${day.close}` : "Horário não informado";

    const lunch =
      day.lunchStart && day.lunchEnd
        ? ` · Almoço: ${day.lunchStart} às ${day.lunchEnd}`
        : "";

    return `${scheduleLabels[key]}: ${openClose}${lunch}`;
  })
  .join("\n");

      const { data: slugConflict } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (slugConflict) {
        setStatus({
          type: "error",
          message: "Esse slug já está em uso. Escolha outro.",
        });
        setSaving(false);
        return;
      }

const companyPayload = {
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
  zip_code: onlyDigits(form.zip_code),
  slug: cleanSlug,
  public_description: form.public_description.trim(),
  public_link_enabled: true,
  public_link_title: form.public_link_title.trim() || form.name.trim(),
  public_link_subtitle: form.public_link_subtitle.trim(),
  business_hours: businessHoursText,
  maps_link: form.maps_link.trim(),
};

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert(companyPayload)
        .select("id")
        .single();

if (companyError || !company?.id) {
  console.error("Erro ao criar empresa:", companyError);

  setStatus({
    type: "error",
    message:
      companyError?.message ||
      companyError?.details ||
      companyError?.hint ||
      "Não foi possível criar a empresa.",
  });
  setSaving(false);
  return;
}

      const { error: membershipError } = await supabase
        .from("company_users")
        .insert({
          company_id: company.id,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) {
        setStatus({
          type: "error",
          message:
            "A empresa foi criada, mas o vínculo do usuário falhou. Verifique a tabela company_users.",
        });
        setSaving(false);
        return;
      }

      setStatus({
        type: "success",
        message: "Empresa criada com sucesso. Redirecionando...",
      });

      setTimeout(() => {
        router.replace("/dashboard/empresa");
      }, 1000);
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao criar a empresa.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando seu onboarding...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto w-full max-w-[760px] px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1d7df2] text-sm font-bold text-white shadow-[0_12px_28px_rgba(29,125,242,0.24)]">
                DF
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  DecorFlow
                </p>
                <h1 className="text-[18px] font-semibold text-slate-950">
                  Onboarding da sua empresa
                </h1>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
                Seja bem-vindo ao DecorFlow
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={`h-2 rounded-full transition ${
                    step >= item ? "bg-[#1d7df2]" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Etapa {step} de 4</span>
              <span>
                {step === 1 && "Dados principais"}
                {step === 2 && "Endereço"}
                {step === 3 && "Página pública"}
                {step === 4 && "Finalização"}
              </span>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            {status.message ? (
              <div
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <StepCard
                  icon={<Building2 className="h-5 w-5" />}
                  title="Dados principais"
                  subtitle="Os dados iniciais da sua empresa"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nome da empresa"
                      value={form.name}
                      onChange={(value) => {
                        updateField("name", value);
                        if (!form.slug || form.slug === slugify(form.name)) {
                          updateField("slug", slugify(value));
                        }
                      }}
                      placeholder="Ex: Decorações Flow"
                      required
                    />

                    <Field
                      label="Instagram"
                      value={form.instagram}
                      onChange={(value) => updateField("instagram", value)}
                      placeholder="@suaempresa"
                      icon={<AtSign className="h-4 w-4" />}
                    />

                    <Field
                      label="WhatsApp"
                      value={form.whatsapp}
                      onChange={(value) => updateField("whatsapp", value)}
                      placeholder="62999999999"
                      icon={<Phone className="h-4 w-4" />}
                    />

                    <Field
                      label="E-mail público"
                      value={form.email_publico}
                      onChange={(value) => updateField("email_publico", value)}
                      placeholder="contato@suaempresa.com"
                      icon={<Mail className="h-4 w-4" />}
                    />
                  </div>
                </StepCard>
              ) : null}

              {step === 2 ? (
                <StepCard
                  icon={<MapPin className="h-5 w-5" />}
                  title="Endereço e localização"
                  subtitle="Com CEP automático para facilitar"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="CEP"
                      value={form.zip_code}
                      onChange={handleCepChange}
                      placeholder="74970-440"
                      icon={
                        loadingCep ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )
                      }
                    />

                    <Field
                      label="Número"
                      value={form.address_number}
                      onChange={(value) => updateField("address_number", value)}
                      placeholder="Ex: 120"
                    />

                    <div className="sm:col-span-2">
                      <Field
                        label="Rua / avenida"
                        value={form.address_line}
                        onChange={(value) => updateField("address_line", value)}
                        placeholder="Ex: Rua Araçari"
                      />
                    </div>

                    <Field
                      label="Bairro"
                      value={form.neighborhood}
                      onChange={(value) => updateField("neighborhood", value)}
                      placeholder="Ex: Colina Azul"
                    />

                    <Field
                      label="Complemento"
                      value={form.address_complement}
                      onChange={(value) =>
                        updateField("address_complement", value)
                      }
                      placeholder="Sala, loja, bloco..."
                    />

                    <Field
                      label="Cidade"
                      value={form.city}
                      onChange={(value) => updateField("city", value)}
                      placeholder="Ex: Aparecida de Goiânia"
                    />

                    <Field
                      label="Estado"
                      value={form.state}
                      onChange={(value) => updateField("state", value)}
                      placeholder="Ex: GO"
                    />

                    <div className="sm:col-span-2">
                      <Field
                        label="Link do Google Maps"
                        value={form.maps_link}
                        onChange={(value) => updateField("maps_link", value)}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </div>
                </StepCard>
              ) : null}

              {step === 3 ? (
                <StepCard
                  icon={<Globe className="h-5 w-5" />}
                  title="Página pública"
                  subtitle="Seu link e apresentação inicial"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Slug público"
                      value={form.slug}
                      onChange={(value) => updateField("slug", slugify(value))}
                      placeholder="decoracoes-flow"
                      required
                      icon={<Link2 className="h-4 w-4" />}
                    />

                    <Field
                      label="Título público"
                      value={form.public_link_title}
                      onChange={(value) =>
                        updateField("public_link_title", value)
                      }
                      placeholder="Ex: Decoração premium para festas"
                    />

                    <div className="sm:col-span-2">
                      <Field
                        label="Subtítulo público"
                        value={form.public_link_subtitle}
                        onChange={(value) =>
                          updateField("public_link_subtitle", value)
                        }
                        placeholder="Ex: Personalizados em geral"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <TextAreaField
                        label="Descrição pública"
                        value={form.public_description}
                        onChange={(value) =>
                          updateField("public_description", value)
                        }
                        placeholder="Descreva sua empresa, seus diferenciais e o que torna sua marca especial..."
                        rows={4}
                      />
                    </div>

<div className="sm:col-span-2">
  <label className="text-sm font-medium text-slate-700">
    Horário de funcionamento
  </label>

  <div className="mt-2 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
    <BusinessDayRow
      label="Segunda"
      dayKey="monday"
      day={form.business_schedule.monday}
      onChange={updateBusinessDay}
    />
    <BusinessDayRow
      label="Terça"
      dayKey="tuesday"
      day={form.business_schedule.tuesday}
      onChange={updateBusinessDay}
    />
    <BusinessDayRow
      label="Quarta"
      dayKey="wednesday"
      day={form.business_schedule.wednesday}
      onChange={updateBusinessDay}
    />
    <BusinessDayRow
      label="Quinta"
      dayKey="thursday"
      day={form.business_schedule.thursday}
      onChange={updateBusinessDay}
    />
    <BusinessDayRow
      label="Sexta"
      dayKey="friday"
      day={form.business_schedule.friday}
      onChange={updateBusinessDay}
    />
    <BusinessDayRow
      label="Sábado"
      dayKey="saturday"
      day={form.business_schedule.saturday}
      onChange={updateBusinessDay}
    />
    <BusinessDayRow
      label="Domingo"
      dayKey="sunday"
      day={form.business_schedule.sunday}
      onChange={updateBusinessDay}
    />
  </div>
</div>
                  </div>
                </StepCard>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4">
                  <StepCard
                    icon={<Store className="h-5 w-5" />}
                    title="Resumo da sua empresa"
                    subtitle="Confira antes de finalizar"
                  >
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                      <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_100%)] px-5 py-6 text-white">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/70">
                          Preview público
                        </p>
                        <h3 className="mt-2 text-xl font-semibold">
                          {form.public_link_title || form.name || "Sua empresa"}
                        </h3>
                        <p className="mt-2 text-sm text-blue-100/80">
                          {form.public_link_subtitle ||
                            "Sua presença pública será criada com base nessas informações."}
                        </p>
                      </div>

                      <div className="px-5 py-5">
                        <div className="grid gap-2">
                          <InfoPill label="Empresa" value={form.name || "-"} />
                          <InfoPill
                            label="Instagram"
                            value={form.instagram || "-"}
                          />
                          <InfoPill
                            label="WhatsApp"
                            value={form.whatsapp || "-"}
                          />
                          <InfoPill
                            label="Cidade / Estado"
                            value={
                              form.city || form.state
                                ? `${form.city}${form.city && form.state ? " - " : ""}${form.state}`
                                : "-"
                            }
                          />
                          <InfoPill
                            label="Link público"
                            value={publicLink || "-"}
                          />
                        </div>
                      </div>
                    </div>
                  </StepCard>

                  <StepCard
                    icon={<Sparkles className="h-5 w-5" />}
                    title="Finalizar estrutura"
                    subtitle="Cria empresa, vínculo e base pública"
                  >
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d7df2] px-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(29,125,242,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Criando empresa...
                        </>
                      ) : (
                        <>
                          Criar empresa e continuar
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </StepCard>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={step === 1 || saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function StepCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void | Promise<void>;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        ) : null}

        <input
          type="text"
          value={value}
          onChange={(e) => void onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}

function TextAreaField({
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
      />
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function BusinessDayRow({
  label,
  dayKey,
  day,
  onChange,
}: {
  label: string;
  dayKey:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  day: BusinessDay;
  onChange: (
    day:
      | "monday"
      | "tuesday"
      | "wednesday"
      | "thursday"
      | "friday"
      | "saturday"
      | "sunday",
    field: keyof BusinessDay,
    value: boolean | string
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">{label}</p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(dayKey, "enabled", !day.enabled)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                day.enabled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {day.enabled ? "Aberto" : "Fechado"}
            </button>

            <button
              type="button"
              onClick={() => onChange(dayKey, "is24h", !day.is24h)}
              disabled={!day.enabled}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                day.is24h
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              24 horas
            </button>
          </div>
        </div>

        {day.enabled && !day.is24h ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Início
              </label>
              <input
                type="time"
                value={day.open}
                onChange={(e) => onChange(dayKey, "open", e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Fim
              </label>
              <input
                type="time"
                value={day.close}
                onChange={(e) => onChange(dayKey, "close", e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Almoço início
              </label>
              <input
                type="time"
                value={day.lunchStart}
                onChange={(e) => onChange(dayKey, "lunchStart", e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Almoço fim
              </label>
              <input
                type="time"
                value={day.lunchEnd}
                onChange={(e) => onChange(dayKey, "lunchEnd", e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}