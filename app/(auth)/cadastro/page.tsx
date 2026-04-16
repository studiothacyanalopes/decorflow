"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";


export default function CadastroPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleCadastro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

setSuccess(true);

  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(245,247,251,1)_40%,rgba(239,243,248,1)_100%)]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#1d7df2]" />
        <div className="absolute right-[-70px] top-[40px] h-[260px] w-[260px] rotate-[28deg] rounded-[62px] bg-[#1d7df2]" />
        <div className="absolute left-[40px] bottom-[30px] h-[210px] w-[210px] rotate-[42deg] rounded-[56px] bg-[#1d7df2]" />

        <div className="absolute left-[10%] top-[20%] h-[180px] w-[180px] rounded-full bg-[#1d7df2]/12 blur-3xl" />
        <div className="absolute right-[18%] top-[22%] h-[200px] w-[200px] rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="absolute bottom-[12%] left-[18%] h-[160px] w-[160px] rounded-full bg-violet-300/12 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1560px] items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[34px] border border-black/5 bg-white/55 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1fr_0.95fr]">
          <section className="relative hidden overflow-hidden lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4fb_46%,#edf3fa_100%)]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(29,125,242,0.14),transparent_20%),radial-gradient(circle_at_80%_18%,rgba(103,232,249,0.12),transparent_18%),radial-gradient(circle_at_72%_78%,rgba(139,92,246,0.10),transparent_16%)]" />

            <div className="relative z-10 flex w-full items-center justify-center px-10 py-12 xl:px-16">
              <div className="w-full max-w-[620px]">
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#1d7df2] text-lg font-bold text-white shadow-[0_16px_32px_rgba(29,125,242,0.24)]">
                    DF
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400">
                      DecorFlow
                    </p>
                    <h1 className="mt-1 text-[40px] font-semibold tracking-[-0.06em] text-slate-950">
                      DecorFlow
                    </h1>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(29,125,242,0.96),rgba(47,110,239,0.92))] p-10 text-white shadow-[0_24px_60px_rgba(29,125,242,0.20)]">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.26em] text-white/70">
                      DecorFlow
                    </p>

                    <h2 className="mt-8 text-5xl font-semibold leading-[0.94] tracking-[-0.06em]">
                      Crie sua
                      <br />
                      conta
                    </h2>

                    <p className="mt-6 max-w-[260px] text-sm leading-7 text-white/78">
                      Configure seu acesso e comece sua operação com uma
                      experiência mais premium e organizada.
                    </p>

                    <div className="mt-10 space-y-3">
                      <div className="h-2 w-20 rounded-full bg-white/25" />
                      <div className="h-2 w-32 rounded-full bg-white/20" />
                    </div>
                  </div>

                  <div className="relative rounded-[32px] border border-white/80 bg-white/72 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-200/90 blur-sm" />
                    <div className="absolute left-[-18px] top-[68px] h-20 w-20 rounded-full bg-[#1d7df2]/18 blur-[2px]" />
                    <div className="absolute bottom-8 right-8 h-24 w-24 rounded-full bg-violet-200/70 blur-[2px]" />
                    <div className="absolute left-8 bottom-10 h-20 w-20 rounded-full bg-sky-200/70 blur-[2px]" />

                    <div className="relative h-full min-h-[360px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(241,246,252,0.88))]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(29,125,242,0.18),transparent_16%),radial-gradient(circle_at_78%_24%,rgba(96,165,250,0.18),transparent_16%),radial-gradient(circle_at_70%_78%,rgba(167,139,250,0.16),transparent_14%),radial-gradient(circle_at_26%_76%,rgba(34,211,238,0.14),transparent_14%)]" />
                      <div className="absolute inset-0 opacity-[0.25] bg-[radial-gradient(circle,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:16px_16px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-4 sm:p-6 lg:p-8 xl:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,125,242,0.08),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(103,232,249,0.08),transparent_18%)]" />

            <div className="relative z-10 w-full max-w-[400px] rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="inline-flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1d7df2] text-sm font-bold text-white shadow-[0_12px_26px_rgba(29,125,242,0.20)]">
                    DF
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      DecorFlow
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      Sign up
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-[34px] font-semibold tracking-[-0.06em] text-slate-950">
                Criar conta
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Configure seu acesso para começar.
              </p>

              <form onSubmit={handleCadastro} className="mt-7 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Seu nome
                  </label>

                  <input
                    type="text"
                    placeholder="Digite seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    E-mail
                  </label>

                  <input
                    type="email"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Senha
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Crie uma senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d7df2] focus:ring-4 focus:ring-[#1d7df2]/10"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                {success ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                        <p className="font-semibold">Conta criada com sucesso 🎉</p>
                        <p className="mt-1">
                        Enviamos um e-mail de confirmação para <span className="font-medium">{email}</span>.
                        </p>
                        <p className="mt-1">
                        Verifique sua caixa de entrada (e o spam) e clique no link para ativar sua conta.
                        </p>
                    </div>
                    ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1d7df2] px-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(29,125,242,0.22)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar conta
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                Já tem conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#1d7df2] transition hover:text-[#0f63c9]"
                >
                  Entrar
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}