export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-slate-500">
            Bem-vindo ao DecorFlow
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Seu sistema premium para gestão de festas e personalizados
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Aqui tudo vai ser conectado direto com o Supabase, sem dados fake.
          </p>
        </div>
      </section>
    </div>
  );
}