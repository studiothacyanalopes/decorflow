"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mail,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompanyContext = {
  id: string;
  name: string;
};

type MemberRoleType = "owner" | "admin" | "member";

type PermissionMap = {
  painel: boolean;
  fluxo: boolean;
  pedidos: boolean;
  clientes: boolean;
  produtos: boolean;
  catalogo: boolean;
  financeiro: boolean;
  relatorios: boolean;
  equipe: boolean;
  empresa: boolean;
  configuracoes: boolean;
};

type CompanyUser = {
  id?: string;
  company_id: string;
  user_id: string | null;
  role: MemberRoleType;
  custom_role: string | null;
  permissions: PermissionMap | null;
  member_status: string;
  display_name: string | null;
  invite_email: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at?: string;
};

type TeamInvite = {
  id: string;
  company_id: string;
  email: string;
  display_name: string | null;
  role_type: MemberRoleType;
  custom_role: string | null;
  permissions: PermissionMap | null;
  invite_status: "pending" | "accepted" | "cancelled" | "expired";
  invite_token: string;
  invited_by: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type StatusState = {
  type: "success" | "error" | "";
  message: string;
};

const DEFAULT_PERMISSIONS: PermissionMap = {
  painel: true,
  fluxo: true,
  pedidos: true,
  clientes: true,
  produtos: true,
  catalogo: true,
  financeiro: false,
  relatorios: false,
  equipe: false,
  empresa: false,
  configuracoes: false,
};

const ALL_PERMISSION_KEYS: { key: keyof PermissionMap; label: string }[] = [
  { key: "painel", label: "Painel" },
  { key: "fluxo", label: "Fluxo" },
  { key: "pedidos", label: "Pedidos" },
  { key: "clientes", label: "Clientes" },
  { key: "produtos", label: "Produtos" },
  { key: "catalogo", label: "Catálogo" },
  { key: "financeiro", label: "Financeiro" },
  { key: "relatorios", label: "Relatórios" },
  { key: "equipe", label: "Equipe" },
  { key: "empresa", label: "Empresa" },
  { key: "configuracoes", label: "Configurações" },
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRoleLabel(role: MemberRoleType) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Membro";
}

function roleTone(role: MemberRoleType) {
  if (role === "owner") return "border-violet-200 bg-violet-50 text-violet-700";
  if (role === "admin") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function inviteStatusTone(status: string) {
  if (status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function ensurePermissions(permissions?: PermissionMap | null): PermissionMap {
  return {
    ...DEFAULT_PERMISSIONS,
    ...(permissions || {}),
  };
}

export default function DecorEquipePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<MemberRoleType>("member");
  const [members, setMembers] = useState<CompanyUser[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });
  const [search, setSearch] = useState("");

  const [inviteForm, setInviteForm] = useState({
    display_name: "",
    email: "",
    role_type: "member" as MemberRoleType,
    custom_role: "",
    notes: "",
    permissions: { ...DEFAULT_PERMISSIONS } as PermissionMap,
  });

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
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

      const { data: myMembership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id, role, companies:company_id(id, name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !myMembership?.company_id) {
        setStatus({
          type: "error",
          message: "Nenhuma empresa encontrada para este usuário.",
        });
        return;
      }

      const companyData = Array.isArray(myMembership.companies)
        ? myMembership.companies[0]
        : myMembership.companies;

      setCompany({
        id: myMembership.company_id,
        name: companyData?.name || "Minha empresa",
      });

      setCurrentUserRole((myMembership.role as MemberRoleType) || "member");

      const [membersRes, invitesRes] = await Promise.all([
        supabase
          .from("company_users")
          .select("*")
          .eq("company_id", myMembership.company_id)
          .order("created_at", { ascending: true }),

        supabase
          .from("company_team_invites")
          .select("*")
          .eq("company_id", myMembership.company_id)
          .order("created_at", { ascending: false }),
      ]);

      if (membersRes.error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os membros da equipe.",
        });
        return;
      }

      if (invitesRes.error) {
        setStatus({
          type: "error",
          message: "Não foi possível carregar os convites. Verifique se o SQL da tabela company_team_invites foi rodado.",
        });
        setMembers((membersRes.data || []) as CompanyUser[]);
        setInvites([]);
        return;
      }

      setMembers(
        ((membersRes.data || []) as CompanyUser[]).map((member) => ({
          ...member,
          permissions: ensurePermissions(member.permissions),
        }))
      );

      setInvites(
        ((invitesRes.data || []) as TeamInvite[]).map((invite) => ({
          ...invite,
          permissions: ensurePermissions(invite.permissions),
        }))
      );
    } catch {
      setStatus({
        type: "error",
        message: "Ocorreu um erro inesperado ao carregar a equipe.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!company?.id) return;

    const email = normalizeEmail(inviteForm.email);

    if (!email) {
      setStatus({
        type: "error",
        message: "Informe o e-mail da pessoa que será convidada.",
      });
      return;
    }

    try {
      setSaving(true);
      setStatus({ type: "", message: "" });

      const { error } = await supabase.from("company_team_invites").insert({
        company_id: company.id,
        email,
        display_name: inviteForm.display_name.trim() || null,
        role_type: inviteForm.role_type,
        custom_role: inviteForm.custom_role.trim() || null,
        permissions: inviteForm.permissions,
        invite_status: "pending",
        notes: inviteForm.notes.trim() || null,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      });

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível criar o convite.",
        });
        return;
      }

      setInviteForm({
        display_name: "",
        email: "",
        role_type: "member",
        custom_role: "",
        notes: "",
        permissions: { ...DEFAULT_PERMISSIONS },
      });

      setStatus({
        type: "success",
        message: "Convite criado com sucesso.",
      });

      await loadTeam();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateMember(
    member: CompanyUser,
    patch: Partial<CompanyUser>,
    successMessage: string
  ) {
    if (!member.user_id || !company?.id) return;

    try {
      setSavingMemberId(member.user_id);
      setStatus({ type: "", message: "" });

      const { error } = await supabase
        .from("company_users")
        .update(patch)
        .eq("company_id", company.id)
        .eq("user_id", member.user_id);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível atualizar este membro.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: successMessage,
      });

      await loadTeam();
    } finally {
      setSavingMemberId(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      setSaving(true);
      setStatus({ type: "", message: "" });

      const { error } = await supabase
        .from("company_team_invites")
        .update({
          invite_status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", inviteId);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível cancelar o convite.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Convite cancelado com sucesso.",
      });

      await loadTeam();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    try {
      setSaving(true);
      setStatus({ type: "", message: "" });

      const { error } = await supabase
        .from("company_team_invites")
        .delete()
        .eq("id", inviteId);

      if (error) {
        setStatus({
          type: "error",
          message: "Não foi possível excluir o convite.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Convite excluído com sucesso.",
      });

      await loadTeam();
    } finally {
      setSaving(false);
    }
  }

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return members.filter((member) =>
      [
        member.display_name || "",
        member.invite_email || "",
        member.custom_role || "",
        member.role || "",
        member.user_id || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [members, search]);

  const filteredInvites = useMemo(() => {
    const term = search.trim().toLowerCase();

    return invites.filter((invite) =>
      [
        invite.display_name || "",
        invite.email || "",
        invite.custom_role || "",
        invite.role_type || "",
        invite.invite_status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [invites, search]);

  const metrics = useMemo(() => {
    return {
      totalMembers: members.length,
      activeMembers: members.filter((item) => item.member_status === "active").length,
      pendingInvites: invites.filter((item) => item.invite_status === "pending").length,
      admins: members.filter((item) => item.role === "admin").length,
      owners: members.filter((item) => item.role === "owner").length,
    };
  }, [members, invites]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando equipe...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1820px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                  DecorFlow
                </div>
                <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[36px]">
                  Equipe
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                  Convide pessoas para fazer parte da empresa, acompanhe status do convite, defina cargo personalizado e controle o que cada membro pode visualizar.
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
              <MetricCard label="Total de membros" value={String(metrics.totalMembers)} />
              <MetricCard label="Membros ativos" value={String(metrics.activeMembers)} />
              <MetricCard label="Convites pendentes" value={String(metrics.pendingInvites)} />
              <MetricCard label="Admins" value={String(metrics.admins)} />
              <MetricCard label="Owners" value={String(metrics.owners)} />
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50/70 xl:border-b-0 xl:border-r">
              <div className="p-4 sm:p-5">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-slate-700" />
                    <h2 className="text-base font-semibold text-slate-950">
                      Convidar membro
                    </h2>
                  </div>

                  <form onSubmit={handleCreateInvite} className="mt-4 space-y-3">
                    <Input
                      label="Nome da pessoa"
                      value={inviteForm.display_name}
                      onChange={(value) =>
                        setInviteForm((prev) => ({ ...prev, display_name: value }))
                      }
                      placeholder="Ex: Maria Souza"
                    />

                    <Input
                      label="E-mail"
                      value={inviteForm.email}
                      onChange={(value) =>
                        setInviteForm((prev) => ({ ...prev, email: value }))
                      }
                      placeholder="Ex: maria@email.com"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectInput
                        label="Tipo de acesso"
                        value={inviteForm.role_type}
                        onChange={(value) =>
                          setInviteForm((prev) => ({
                            ...prev,
                            role_type: value as MemberRoleType,
                            permissions:
                              value === "owner"
                                ? {
                                    painel: true,
                                    fluxo: true,
                                    pedidos: true,
                                    clientes: true,
                                    produtos: true,
                                    catalogo: true,
                                    financeiro: true,
                                    relatorios: true,
                                    equipe: true,
                                    empresa: true,
                                    configuracoes: true,
                                  }
                                : value === "admin"
                                ? {
                                    painel: true,
                                    fluxo: true,
                                    pedidos: true,
                                    clientes: true,
                                    produtos: true,
                                    catalogo: true,
                                    financeiro: true,
                                    relatorios: true,
                                    equipe: false,
                                    empresa: false,
                                    configuracoes: false,
                                  }
                                : { ...DEFAULT_PERMISSIONS },
                          }))
                        }
                        options={[
                          { value: "owner", label: "Owner" },
                          { value: "admin", label: "Admin" },
                          { value: "member", label: "Membro" },
                        ]}
                      />

                      <Input
                        label="Cargo personalizado"
                        value={inviteForm.custom_role}
                        onChange={(value) =>
                          setInviteForm((prev) => ({ ...prev, custom_role: value }))
                        }
                        placeholder="Ex: Vendedor, Atendimento, Operacional..."
                      />
                    </div>

                    <Textarea
                      label="Observações"
                      value={inviteForm.notes}
                      onChange={(value) =>
                        setInviteForm((prev) => ({ ...prev, notes: value }))
                      }
                      placeholder="Observações internas sobre o convite"
                      rows={3}
                    />

                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-slate-700" />
                        <p className="text-sm font-semibold text-slate-900">
                          Permissões de visualização
                        </p>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {ALL_PERMISSION_KEYS.map((permission) => (
                          <TogglePermission
                            key={permission.key}
                            label={permission.label}
                            checked={inviteForm.permissions[permission.key]}
                            disabled={inviteForm.role_type === "owner"}
                            onChange={(checked) =>
                              setInviteForm((prev) => ({
                                ...prev,
                                permissions: {
                                  ...prev.permissions,
                                  [permission.key]: checked,
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving || (currentUserRole !== "owner" && currentUserRole !== "admin")}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Criar convite
                    </button>
                  </form>
                </div>
              </div>
            </aside>

            <section className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
              <div className="space-y-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar membro, e-mail, cargo ou convite"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                  />
                </div>

                <div className="space-y-4">
                  <SectionHeader
                    icon={<Users className="h-5 w-5 text-slate-700" />}
                    title="Membros da equipe"
                    subtitle="Quem já faz parte da empresa."
                  />

                  <div className="space-y-4">
                    {filteredMembers.length === 0 ? (
                      <EmptyBlock text="Nenhum membro encontrado." />
                    ) : (
                      filteredMembers.map((member) => {
                        const permissions = ensurePermissions(member.permissions);

                        return (
                          <div
                            key={`${member.user_id}-${member.company_id}`}
                            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-base font-semibold text-slate-950">
                                    {member.display_name || "Sem nome definido"}
                                  </span>

                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleTone(
                                      member.role
                                    )}`}
                                  >
                                    {getRoleLabel(member.role)}
                                  </span>

                                  {member.custom_role ? (
                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                      {member.custom_role}
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-2 text-sm text-slate-500 break-all">
                                  {member.invite_email || member.user_id || "Sem e-mail"}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                  <span>Entrou em {formatDateTime(member.joined_at || member.created_at)}</span>
                                  <span>Status: {member.member_status || "active"}</span>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
                                <SelectInput
                                  label="Tipo de acesso"
                                  value={member.role}
                                  onChange={(value) =>
                                    handleUpdateMember(
                                      member,
                                      {
                                        role: value as MemberRoleType,
                                        permissions:
                                          value === "owner"
                                            ? {
                                                painel: true,
                                                fluxo: true,
                                                pedidos: true,
                                                clientes: true,
                                                produtos: true,
                                                catalogo: true,
                                                financeiro: true,
                                                relatorios: true,
                                                equipe: true,
                                                empresa: true,
                                                configuracoes: true,
                                              }
                                            : ensurePermissions(member.permissions),
                                      },
                                      "Tipo de acesso atualizado."
                                    )
                                  }
                                  options={[
                                    { value: "owner", label: "Owner" },
                                    { value: "admin", label: "Admin" },
                                    { value: "member", label: "Membro" },
                                  ]}
                                  disabled={currentUserRole !== "owner" && currentUserRole !== "admin"}
                                />

                                <Input
                                  label="Cargo personalizado"
                                  value={member.custom_role || ""}
                                  onChange={() => {}}
                                  placeholder="Cargo"
                                  readOnly
                                />
                              </div>
                            </div>

                            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-slate-700" />
                                <p className="text-sm font-semibold text-slate-900">
                                  Abas que este membro pode visualizar
                                </p>
                              </div>

                              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {ALL_PERMISSION_KEYS.map((permission) => (
                                  <TogglePermission
                                    key={permission.key}
                                    label={permission.label}
                                    checked={permissions[permission.key]}
                                    disabled={
                                      member.role === "owner" ||
                                      (currentUserRole !== "owner" && currentUserRole !== "admin") ||
                                      savingMemberId === member.user_id
                                    }
                                    onChange={(checked) =>
                                      handleUpdateMember(
                                        member,
                                        {
                                          permissions: {
                                            ...permissions,
                                            [permission.key]: checked,
                                          },
                                        },
                                        "Permissões atualizadas."
                                      )
                                    }
                                  />
                                ))}
                              </div>

                              {savingMemberId === member.user_id ? (
                                <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Salvando membro...
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <SectionHeader
                    icon={<Mail className="h-5 w-5 text-slate-700" />}
                    title="Convites"
                    subtitle="Status dos convites enviados para a equipe."
                  />

                  <div className="space-y-4">
                    {filteredInvites.length === 0 ? (
                      <EmptyBlock text="Nenhum convite encontrado." />
                    ) : (
                      filteredInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold text-slate-950">
                                  {invite.display_name || "Convite sem nome"}
                                </span>

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleTone(
                                    invite.role_type
                                  )}`}
                                >
                                  {getRoleLabel(invite.role_type)}
                                </span>

                                {invite.custom_role ? (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    {invite.custom_role}
                                  </span>
                                ) : null}

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${inviteStatusTone(
                                    invite.invite_status
                                  )}`}
                                >
                                  {invite.invite_status}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-500 break-all">
                                {invite.email}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                <span>Criado em {formatDateTime(invite.created_at)}</span>
                                <span>Expira em {formatDateTime(invite.expires_at)}</span>
                                <span>Aceito em {formatDateTime(invite.accepted_at)}</span>
                              </div>

                              {invite.notes ? (
                                <p className="mt-3 text-sm text-slate-500">
                                  {invite.notes}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {invite.invite_status === "pending" ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelInvite(invite.id)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancelar
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => handleDeleteInvite(invite.id)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </button>
                            </div>
                          </div>

                          <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                              <UserCog className="h-4 w-4 text-slate-700" />
                              <p className="text-sm font-semibold text-slate-900">
                                Permissões previstas no convite
                              </p>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {ALL_PERMISSION_KEYS.map((permission) => (
                                <PermissionPill
                                  key={permission.key}
                                  label={permission.label}
                                  enabled={ensurePermissions(invite.permissions)[permission.key]}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
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
        readOnly={readOnly}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 read-only:bg-slate-50"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
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

function TogglePermission({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function PermissionPill({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center justify-between rounded-2xl border px-4 py-3 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-3 text-xs font-semibold">
        {enabled ? "liberado" : "bloqueado"}
      </span>
    </div>
  );
}