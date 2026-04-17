import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Package,
  ClipboardList,
  Users,
  BarChart3,
  FileText,
  ShieldCheck,
  Phone,
  Store,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
  CalendarDays,
  Truck,
  Star,
  Boxes,
} from "lucide-react";

const plans = [
  {
    name: "Start",
    price: "R$ 99,90",
    description: "Para operações menores que querem sair do improviso e ganhar organização.",
    features: [
      "Até 6 usuários",
      "Menu completo do sistema",
      "Até 3.000 produtos cadastrados",
      "Catálogo digital da empresa",
      "Gestão de pedidos e clientes",
      "Painel financeiro básico",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 179,90",
    description: "Para empresas que querem vender melhor e operar com mais profissionalismo.",
    features: [
      "Mais usuários para equipe",
      "Catálogo digital mais forte",
      "Gestão de pedidos, contratos e clientes",
      "Fluxo financeiro mais completo",
      "WhatsApp integrado ao processo comercial",
      "Mais controle operacional no dia a dia",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "R$ 329,90",
    description: "Para empresas que querem o pacote mais completo e estrutura para crescer.",
    features: [
      "Tudo do plano Pro",
      "Maior capacidade operacional",
      "Mais equipe e estrutura",
      "Recursos avançados de gestão",
      "Operação mais robusta para expansão",
      "Plano mais completo do DecorFlow",
    ],
    highlight: false,
  },
];

const segments = [
  "Decoração de festas",
  "Pegue e monte",
  "Locação de móveis e itens",
  "Vestidos e trajes",
  "Pula pula e recreação",
  "Personalizados e kits",
  "Vendas em geral",
  "Empresas de eventos",
];

const features = [
  {
    icon: Store,
    title: "Catálogo digital mais profissional",
    description:
      "Apresente seus produtos, kits e composições de forma muito mais organizada, sem depender de mandar foto por foto no WhatsApp.",
  },
  {
    icon: ClipboardList,
    title: "Pedidos com mais clareza",
    description:
      "Centralize informações do pedido, retirada, entrega, itens escolhidos, observações e acompanhamento operacional.",
  },
  {
    icon: Users,
    title: "Clientes e histórico",
    description:
      "Tenha visão de quem comprou, quantas vezes alugou, ticket, preferências e histórico da operação.",
  },
  {
    icon: BarChart3,
    title: "Financeiro e visão do negócio",
    description:
      "Acompanhe pedidos, entradas, custos, contratos e evolução da operação com uma visão mais profissional.",
  },
];

const steps = [
  {
    icon: Package,
    title: "Cadastre seus produtos e categorias",
    description:
      "Organize kits, itens avulsos, categorias e variações em um sistema pronto para sua operação.",
  },
  {
    icon: MessageCircle,
    title: "Compartilhe seu catálogo com o cliente",
    description:
      "Envie uma apresentação mais bonita e clara, deixando a decisão de compra muito mais fácil.",
  },
  {
    icon: ClipboardList,
    title: "Receba pedidos com mais contexto",
    description:
      "O cliente entende melhor o que você oferece e seu atendimento fica muito mais prático.",
  },
  {
    icon: ShieldCheck,
    title: "Controle operação e fechamento",
    description:
      "Acompanhe pedidos, contratos, clientes e andamento da empresa em um único ambiente.",
  },
];

const stats = [
  { label: "Catálogo", value: "Mais apresentação" },
  { label: "Pedidos", value: "Mais organização" },
  { label: "Clientes", value: "Mais histórico" },
  { label: "Operação", value: "Mais controle" },
];

export default function DecorFlowLandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef3f9_0%,#f7f9fc_55%,#f4f7fb_100%)]">
        <div className="absolute inset-0">
          <div className="absolute left-[-80px] top-[-80px] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-[-120px] top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-6 lg:px-8">
          <header className="sticky top-4 z-30">
            <div className="rounded-[32px] border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f80ed] text-white shadow-md">
                    <span className="text-sm font-bold">DF</span>
                  </div>

                  <div>
                    <p className="text-lg font-bold tracking-tight text-slate-900">DecorFlow</p>
                    <p className="text-xs text-slate-500">by Web Division</p>
                  </div>
                </div>

                <nav className="hidden items-center gap-8 lg:flex">
                  <a href="#beneficios" className="text-sm font-medium text-slate-600 transition hover:text-[#2f80ed]">
                    Benefícios
                  </a>
                  <a href="#segmentos" className="text-sm font-medium text-slate-600 transition hover:text-[#2f80ed]">
                    Segmentos
                  </a>
                  <a href="#como-funciona" className="text-sm font-medium text-slate-600 transition hover:text-[#2f80ed]">
                    Como funciona
                  </a>
                  <a href="#planos" className="text-sm font-medium text-slate-600 transition hover:text-[#2f80ed]">
                    Planos
                  </a>
                  <a href="#faq" className="text-sm font-medium text-slate-600 transition hover:text-[#2f80ed]">
                    FAQ
                  </a>
                </nav>

                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="hidden rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex"
                  >
                    Entrar
                  </Link>

                  <a
                    href="https://wa.me/5562994693465?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20DecorFlow."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#2f80ed] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f6fdb]"
                  >
                    Falar no WhatsApp
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </header>

          <div className="grid items-center gap-14 pb-20 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:pb-24 lg:pt-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-[#2f80ed] shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Sistema desenvolvido para empresas de locação, decoração e operação por catálogo
              </div>

              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                O sistema ideal para quem quer
                <span className="mt-2 block text-[#2f80ed]">
                  vender melhor, organizar pedidos e apresentar a empresa com mais valor
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                O DecorFlow foi criado para empresas de locação, pegue e monte, vestidos,
                personalizados, pula pula e vendas em geral que querem sair do improviso,
                reduzir a bagunça no atendimento e parar de depender de enviar um monte de fotos no WhatsApp.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://wa.me/5562994693465?text=Ol%C3%A1%2C%20quero%20ver%20uma%20demonstra%C3%A7%C3%A3o%20do%20DecorFlow."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f80ed] px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f6fdb]"
                >
                  Quero ver uma demonstração
                  <ArrowRight className="h-4 w-4" />
                </a>

                <a
                  href="#planos"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Ver planos
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  "Catálogo digital profissional",
                  "Pedidos mais organizados",
                  "Mais visão sobre clientes",
                  "Fechamento mais profissional",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <CheckCircle2 className="h-5 w-5 text-[#2f80ed]" />
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-8">
                {stats.map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-8 top-8 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
              <div className="absolute -left-8 bottom-4 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="bg-[linear-gradient(180deg,#eef4fb_0%,#e9f1f9_100%)] p-7">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2f80ed] text-white">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          DecorFlow
                        </p>
                        <p className="text-3xl font-black tracking-tight text-slate-950">DecorFlow</p>
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-[#2f80ed] p-7 text-white shadow-lg">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
                        Sistema premium
                      </p>
                      <h3 className="mt-6 text-4xl font-black leading-none">
                        Mais controle
                        <span className="mt-2 block">para o seu negócio</span>
                      </h3>
                      <p className="mt-5 text-sm leading-7 text-blue-50">
                        Uma apresentação mais elegante para vender melhor, organizar pedidos e profissionalizar sua operação.
                      </p>

                      <div className="mt-8 space-y-2">
                        <div className="h-3 w-24 rounded-full bg-white/30" />
                        <div className="h-3 w-36 rounded-full bg-white/20" />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Catálogo
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Mais bonito</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Pedidos
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Mais claros</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-7">
                    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                      <img
                        src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
                        alt="Empresa do segmento de eventos e decoração"
                        className="h-[260px] w-full object-cover"
                      />
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Catálogo mais profissional</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Menos bagunça no WhatsApp e mais clareza no atendimento.
                            </p>
                          </div>
                          <Store className="h-5 w-5 text-[#2f80ed]" />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-[#2f80ed]" />
                            <p className="text-sm font-semibold text-slate-900">Pedidos</p>
                          </div>
                          <p className="text-sm text-slate-500">
                            Mais organização do início ao fechamento.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4 text-[#2f80ed]" />
                            <p className="text-sm font-semibold text-slate-900">Clientes</p>
                          </div>
                          <p className="text-sm text-slate-500">
                            Mais visão sobre histórico e recorrência.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[linear-gradient(135deg,#173b72_0%,#2f80ed_100%)] p-5 text-white">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-100" />
                          <p className="text-sm font-semibold">Feito para operações reais</p>
                        </div>
                        <p className="mt-2 text-sm text-blue-50">
                          Decoração, pegue e monte, vestidos, pula pula, personalizados e locações em geral.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 left-6 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg xl:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2f80ed]">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Painel profissional</p>
                    <p className="text-xs text-slate-500">Mais controle do negócio</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-5 top-14 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg xl:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2f80ed]">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Operação organizada</p>
                    <p className="text-xs text-slate-500">Catálogo, pedidos e clientes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="segmentos" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
              Segmentos atendidos
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Um sistema pensado para vários tipos de operação dentro do mercado de festas e locação
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {segments.map((segment) => (
              <div
                key={segment}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-center shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-700">{segment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
              Benefícios do DecorFlow
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Um sistema que organiza o atendimento, profissionaliza sua apresentação e melhora a rotina da operação
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              A proposta do DecorFlow é simples: deixar sua empresa com mais cara de sistema de verdade,
              mais clareza no atendimento e mais controle operacional.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2f80ed]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid items-center gap-10 rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
                Atendimento mais forte
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Mostre sua empresa com mais valor e reduza a sensação de atendimento improvisado
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Quando seu cliente vê um catálogo mais organizado, entende melhor os itens, compara melhor
                as opções e enxerga mais profissionalismo na sua marca.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-[#2f80ed]" />
                    <p className="text-sm font-semibold text-slate-900">Menos troca confusa no WhatsApp</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#2f80ed]" />
                    <p className="text-sm font-semibold text-slate-900">Mais clareza no fechamento</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-[#2f80ed]" />
                    <p className="text-sm font-semibold text-slate-900">Mais controle de entrega e retirada</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[#2f80ed]" />
                    <p className="text-sm font-semibold text-slate-900">Mais visão da operação</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50">
              <img
                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80"
                alt="Montagem de mesa decorada para eventos"
                className="h-[420px] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Um fluxo simples para deixar sua empresa mais organizada e mais profissional
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2f80ed]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid items-center gap-10 rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#173b72_0%,#2f80ed_100%)] p-8 text-white shadow-[0_20px_60px_rgba(23,59,114,0.22)] lg:grid-cols-[1fr_0.9fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
                Visão comercial e operacional
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                O DecorFlow ajuda sua empresa a vender melhor e operar com mais controle
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-50">
                Não é só uma página bonita. É uma estrutura pensada para catálogo, pedidos,
                clientes, contratos, acompanhamento e crescimento da empresa.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://wa.me/5562994693465?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20DecorFlow."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-[#173b72] transition hover:bg-slate-100"
                >
                  Falar com a Web Division
                  <Phone className="h-4 w-4" />
                </a>

                <a
                  href="#planos"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Ver planos
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80"
                alt="Equipe organizando evento"
                className="h-[340px] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="bg-[#f4f7fb]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
              Planos
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Escolha o plano ideal para o tamanho da sua operação
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Uma estrutura comercial clara para empresas que querem evoluir do atendimento manual para algo muito mais profissional.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={[
                  "relative rounded-[32px] border p-7 shadow-sm transition hover:-translate-y-1",
                  plan.highlight
                    ? "border-[#2f80ed] bg-[linear-gradient(180deg,#173b72_0%,#2f80ed_100%)] text-white shadow-[0_25px_70px_rgba(47,128,237,0.24)]"
                    : "border-slate-200 bg-white text-slate-900 hover:shadow-lg",
                ].join(" ")}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f80ed] shadow-sm">
                    Mais escolhido
                  </div>
                )}

                <h3 className="text-2xl font-black">{plan.name}</h3>
                <p className={`mt-3 text-sm leading-6 ${plan.highlight ? "text-blue-50" : "text-slate-500"}`}>
                  {plan.description}
                </p>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className={plan.highlight ? "pb-1 text-sm text-blue-100" : "pb-1 text-sm text-slate-500"}>
                    /mês
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className={`mt-0.5 h-5 w-5 ${plan.highlight ? "text-white" : "text-[#2f80ed]"}`} />
                      <span className={`text-sm leading-6 ${plan.highlight ? "text-blue-50" : "text-slate-700"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <a
                    href="https://wa.me/5562994693465?text=Ol%C3%A1%2C%20quero%20assinar%20o%20DecorFlow."
                    target="_blank"
                    rel="noreferrer"
                    className={[
                      "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition",
                      plan.highlight
                        ? "bg-white text-[#173b72] hover:bg-slate-100"
                        : "bg-[#2f80ed] text-white hover:bg-[#1f6fdb]",
                    ].join(" ")}
                  >
                    Quero esse plano
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Dúvidas comuns sobre o DecorFlow
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {[
              {
                q: "Para quem o DecorFlow foi criado?",
                a: "Para empresas de locação, pegue e monte, decoração de festas, vestidos, pula pula, personalizados e operações que trabalham com catálogo, pedidos e atendimento comercial.",
              },
              {
                q: "O sistema ajuda no catálogo dos produtos?",
                a: "Sim. Um dos objetivos principais é reduzir aquela rotina de mandar muitas fotos manualmente e trazer uma apresentação mais organizada.",
              },
              {
                q: "Ele serve só para decoração?",
                a: "Não. Apesar do nome DecorFlow, ele também atende outras operações ligadas a locação, vendas e montagem de kits.",
              },
              {
                q: "Consigo falar com vocês antes de assinar?",
                a: "Sim. Você pode falar direto com a Web Division no WhatsApp para entender melhor o fluxo e avaliar qual plano faz mais sentido.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-950">{item.q}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#f4f7fb]">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f80ed] text-white shadow-md">
                <span className="text-sm font-bold">DF</span>
              </div>

              <div>
                <p className="text-base font-bold text-slate-900">DecorFlow</p>
                <p className="text-xs text-slate-500">Desenvolvido pela Web Division</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Entrar
              </Link>

              <a
                href="https://wa.me/5562994693465?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20DecorFlow."
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#2f80ed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6fdb]"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}