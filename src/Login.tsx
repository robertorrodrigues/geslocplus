import { useState, type FormEvent } from "react"

import { api, type AppUser } from "./api"

type PlanId = "mensal" | "semestral" | "anual"

type Plan = {
  id: PlanId

  name: string

  price: number

  cadence: string

  description: string

  featured?: boolean
}

const plans: Plan[] = [
  {
    id: "mensal",

    name: "Mensal",

    price: 100,

    cadence: "por mês",

    description: "Flexibilidade para começar",
  },

  {
    id: "semestral",

    name: "Semestral",

    price: 550,

    cadence: "a cada 6 meses",

    description: "Economize R$ 50 no período",

    featured: true,
  },

  {
    id: "anual",

    name: "Anual",

    price: 1000,

    cadence: "por ano",

    description: "Economize R$ 200 no ano",
  },
]

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",

    currency: "BRL",

    maximumFractionDigits: 2,
  }).format(price)

export default function Login({
  onLogin,

  message,
}: {
  onLogin: (user: AppUser) => void

  message?: string
}) {
  const [view, setView] = useState<"landing" | "login">("landing")

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("mensal")

  const [paymentMethod, setPaymentMethod] = useState<"boleto" | "cartao">(
    "cartao",
  )

  const [fullName, setFullName] = useState("")

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [confirmPassword, setConfirmPassword] = useState("")

  const [acceptTerms, setAcceptTerms] = useState(false)

  const [error, setError] = useState("")

  const [submitting, setSubmitting] = useState(false)

  const [loginEmail, setLoginEmail] = useState("")

  const [loginPassword, setLoginPassword] = useState("")

  const [loginError, setLoginError] = useState(message || "")

  const [loginSubmitting, setLoginSubmitting] = useState(false)

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]

  function choosePlan(planId: PlanId) {
    setSelectedPlanId(planId)

    window.setTimeout(
      () =>
        document

          .getElementById("assinar")

          ?.scrollIntoView({ behavior: "smooth", block: "start" }),

      0,
    )
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.")

      return
    }

    if (password !== confirmPassword) {
      setError("As senhas devem coincidir.")

      return
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os termos antes de continuar.")

      return
    }

    setSubmitting(true)

    try {
      const result = await api<{ user: AppUser }>("/auth/signup", {
        method: "POST",

        body: JSON.stringify({
          fullName,

          email,

          password,

          plan: selectedPlanId,

          paymentMethod,
        }),
      })

      onLogin(result.user)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a conta.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoginError("")

    setLoginSubmitting(true)

    try {
      const result = await api<{ user: AppUser }>("/auth/login", {
        method: "POST",

        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      onLogin(result.user)
    } catch (reason) {
      setLoginError(
        reason instanceof Error ? reason.message : "Falha ao entrar.",
      )
    } finally {
      setLoginSubmitting(false)
    }
  }

  if (view === "login") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f2f4ef] p-5">
        <section className="w-full max-w-[440px] overflow-hidden rounded-[30px] border border-[#e7e9e3] bg-white shadow-[0_24px_70px_rgba(22,35,33,.12)]">
          <div className="bg-[#173e37] px-8 pb-8 pt-9 text-white">
            <Brand light />
            <p className="mt-9 text-xs font-bold uppercase tracking-[.2em] text-white/60">
              Bem-vindo de volta
            </p>
            <h1 className="mt-2 text-[32px] font-extrabold tracking-[-.05em]">
              Acesse sua conta
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Continue cuidando da sua operação com tranquilidade.
            </p>
          </div>
          <form onSubmit={submitLogin} className="space-y-5 p-8">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-xs font-extrabold text-[#59645f]"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className={inputClass}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-xs font-extrabold text-[#59645f]"
              >
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className={inputClass}
                placeholder="Digite sua senha"
              />
            </div>
            {loginError && <ErrorMessage>{loginError}</ErrorMessage>}
            <button
              type="submit"
              disabled={loginSubmitting}
              className="primary-button disabled:cursor-wait disabled:opacity-60"
            >
              {loginSubmitting ? "Entrando..." : "Entrar na plataforma"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginError("")

                setView("landing")
              }}
              className="w-full py-2 text-xs font-extrabold text-[#34705d]"
            >
              Voltar para a página inicial
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[#f7f8f4] text-[#172321]">
      <header className="sticky top-0 z-30 border-b border-[#e8ebe5] bg-[#f7f8f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 md:px-8">
          <a href="#inicio" aria-label="Staywise, início">
            <Brand />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#recursos"
              className="text-sm font-bold text-[#66736d] transition hover:text-[#173e37]"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="text-sm font-bold text-[#66736d] transition hover:text-[#173e37]"
            >
              Planos
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-bold text-[#66736d] transition hover:text-[#173e37]"
            >
              Como funciona
            </a>
          </nav>
          <button
            type="button"
            onClick={() => setView("login")}
            className="rounded-full border border-[#d9e0db] bg-white px-4 py-2.5 text-xs font-extrabold text-[#173e37] transition hover:border-[#9cb5ab] md:px-5 md:text-sm"
          >
            Já tenho uma conta
          </button>
        </div>
      </header>

      <section
        id="inicio"
        className="relative isolate overflow-hidden bg-[#173e37] text-white"
      >
        <div className="pointer-events-none absolute -right-36 -top-56 -z-10 h-[520px] w-[520px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-12 -top-32 -z-10 h-[360px] w-[360px] rounded-full border border-white/10" />
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_.95fr] md:px-8 md:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3.5 py-2 text-[11px] font-bold text-[#d9e8df]">
              <span className="h-2 w-2 rounded-full bg-[#ed9177]" />
              Gestão de temporada, sem complicação
            </div>
            <h1 className="max-w-[650px] text-[42px] font-extrabold leading-[1.05] tracking-[-.06em] sm:text-[54px] md:text-[64px]">
              Mais leve para você.{" "}
              <span className="text-[#b9d1c4]">Melhor para seus hóspedes.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-base leading-7 text-white/70 md:text-lg">
              Organize imóveis, tarefas e pessoas em um só lugar. Tenha mais
              clareza sobre cada estadia e mais tempo para fazer seu negócio
              crescer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#planos"
                className="inline-flex items-center justify-center rounded-full bg-[#ed765f] px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(237,118,95,.24)] transition hover:bg-[#df6954]"
              >
                Começar grátis por 10 dias
                <span aria-hidden="true" className="ml-3 text-lg">
                  →
                </span>
              </a>
              <a
                href="#recursos"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-4 text-sm font-extrabold text-white transition hover:bg-white/10"
              >
                Conhecer a plataforma
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-white/60">
              <span className="flex items-center gap-2">
                <CheckMark /> 10 dias grátis
              </span>
              <span className="flex items-center gap-2">
                <CheckMark /> Sem compromisso
              </span>
              <span className="flex items-center gap-2">
                <CheckMark /> Cancele quando quiser
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="absolute -inset-8 rounded-[50%] bg-[#a7c7b2]/10 blur-3xl" />
            <div className="relative rounded-[30px] border border-white/15 bg-[#f8f7f2] p-4 text-[#172321] shadow-[0_35px_90px_rgba(0,0,0,.24)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[#e7e8e2] pb-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#83908a]">
                    Seu espaço de gestão
                  </p>
                  <p className="mt-1 text-lg font-extrabold tracking-[-.04em]">
                    Visão geral
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e6efe9] text-[#34705d]">
                  <BuildingIcon />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] bg-[#173e37] p-4 text-white">
                  <p className="text-[10px] font-bold text-white/60">
                    Imóveis ativos
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-.05em]">
                    08
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-3/4 rounded-full bg-[#ed9177]" />
                  </div>
                </div>
                <div className="rounded-[20px] bg-[#f0eee7] p-4">
                  <p className="text-[10px] font-bold text-[#77827d]">
                    Tarefas da semana
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-.05em]">
                    12
                  </p>
                  <p className="mt-2 text-[10px] font-bold text-[#34705d]">
                    Tudo organizado
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-[20px] border border-[#e8e7e0] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold">Próximas atividades</p>
                  <span className="rounded-full bg-[#edf4ef] px-2.5 py-1 text-[9px] font-extrabold text-[#34705d]">
                    ESTA SEMANA
                  </span>
                </div>
                <ActivityItem
                  marker="bg-[#ed765f]"
                  title="Check-in · Casa do Lago"
                  detail="Hoje, às 15:00"
                />
                <ActivityItem
                  marker="bg-[#82a990]"
                  title="Limpeza · Loft Central"
                  detail="Amanhã, às 10:00"
                />
                <ActivityItem
                  marker="bg-[#8e83b2]"
                  title="Check-out · Vila Serena"
                  detail="Sexta-feira, às 11:00"
                />
              </div>
              <div className="absolute -bottom-5 -left-3 rounded-2xl border border-[#e6e9e2] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(22,35,33,.13)] sm:-left-8">
                <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#8a9690]">
                  Operação
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs font-extrabold text-[#173e37]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e4f1e9] text-[#34705d]">
                    <CheckMark />
                  </span>
                  Tudo em dia
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="recursos"
        className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-[660px] text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#d7624c]">
            Tudo conectado
          </p>
          <h2 className="mt-3 text-[34px] font-extrabold leading-tight tracking-[-.055em] sm:text-[44px]">
            Sua operação, finalmente em ordem.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#748079] sm:text-base">
            Menos planilhas e mensagens perdidas. Mais controle para cuidar de
            cada detalhe da hospedagem.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            number="01"
            title="Imóveis organizados"
            description="Endereços, administradores, equipamentos e informações essenciais sempre à mão."
            tone="bg-[#eaf1ec] text-[#34705d]"
          />
          <FeatureCard
            number="02"
            title="Rotina sob controle"
            description="Acompanhe tarefas, check-ins, check-outs e manutenção em um só lugar."
            tone="bg-[#f8eee8] text-[#c66e50]"
          />
          <FeatureCard
            number="03"
            title="Pessoas alinhadas"
            description="Centralize os contatos de administradores, prepostos e prestadores."
            tone="bg-[#eeebf7] text-[#76699d]"
          />
          <FeatureCard
            number="04"
            title="Mais tranquilidade"
            description="Tenha uma visão clara do que está acontecendo em cada imóvel."
            tone="bg-[#e9f0f3] text-[#507789]"
          />
        </div>
      </section>

      <section id="como-funciona" className="bg-[#edf1eb]">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 md:grid-cols-[.8fr_1.2fr] md:items-center md:px-8 md:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#d7624c]">
              Simples assim
            </p>
            <h2 className="mt-3 text-[34px] font-extrabold leading-tight tracking-[-.055em] sm:text-[42px]">
              Comece em poucos minutos.
            </h2>
            <p className="mt-4 max-w-[430px] text-sm leading-6 text-[#748079] sm:text-base">
              Crie sua conta, escolha o plano que combina com você e organize
              sua operação com a Staywise.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StepCard
              step="1"
              title="Crie sua conta"
              detail="Seus dados e acesso em um só lugar."
            />
            <StepCard
              step="2"
              title="Escolha seu plano"
              detail="Mensal, semestral ou anual."
            />
            <StepCard
              step="3"
              title="Organize tudo"
              detail="Comece seu teste grátis de 10 dias."
            />
          </div>
        </div>
      </section>

      <section
        id="planos"
        className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-[650px] text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#d7624c]">
            Planos simples
          </p>
          <h2 className="mt-3 text-[34px] font-extrabold leading-tight tracking-[-.055em] sm:text-[44px]">
            Comece com 10 dias grátis.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#748079] sm:text-base">
            Escolha a opção ideal para sua operação. Seu período de teste começa
            com a criação da conta.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-[1020px] items-stretch gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-[28px] border p-6 transition ${
                selectedPlanId === plan.id
                  ? "border-[#173e37] bg-white shadow-[0_18px_50px_rgba(23,62,55,.12)]"
                  : "border-[#e2e6df] bg-white/70"
              }`}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5 rounded-full bg-[#edf4ef] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-[#34705d]">
                  Mais escolhido
                </span>
              )}
              <h3 className="text-lg font-extrabold">{plan.name}</h3>
              <p className="mt-1 text-xs font-semibold text-[#7b8781]">
                {plan.description}
              </p>
              <p className="mt-7 text-[38px] font-extrabold leading-none tracking-[-.06em]">
                {formatPrice(plan.price)}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#7b8781]">
                {plan.cadence}
              </p>
              <div className="my-6 h-px bg-[#eceee9]" />
              <ul className="mb-7 space-y-3 text-xs font-semibold text-[#596761]">
                <li className="flex items-center gap-2">
                  <CheckMark /> Todas as ferramentas incluídas
                </li>
                <li className="flex items-center gap-2">
                  <CheckMark /> 10 dias para experimentar
                </li>
                <li className="flex items-center gap-2">
                  <CheckMark /> Cancele quando quiser
                </li>
              </ul>
              <button
                type="button"
                onClick={() => choosePlan(plan.id)}
                className={`mt-auto w-full rounded-full px-5 py-3.5 text-sm font-extrabold transition ${
                  selectedPlanId === plan.id
                    ? "bg-[#173e37] text-white hover:bg-[#24574c]"
                    : "border border-[#d9e0db] bg-white text-[#173e37] hover:border-[#9cb5ab]"
                }`}
              >
                {selectedPlanId === plan.id
                  ? "Plano selecionado"
                  : "Escolher plano"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section
        id="assinar"
        className="scroll-mt-24 bg-[#173e37] px-5 py-16 text-white md:py-20"
      >
        <div className="mx-auto grid max-w-[1080px] gap-10 md:grid-cols-[.8fr_1.2fr] md:items-start">
          <div className="pt-2">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#b9d1c4]">
              Sua nova rotina começa aqui
            </p>
            <h2 className="mt-4 text-[36px] font-extrabold leading-tight tracking-[-.055em] sm:text-[44px]">
              Crie sua conta e comece grátis.
            </h2>
            <p className="mt-4 max-w-[390px] text-sm leading-6 text-white/65">
              Você está escolhendo o plano{" "}
              <span className="font-extrabold text-white">
                {selectedPlan.name}
              </span>
              . O teste grátis dura 10 dias.
            </p>
            <div className="mt-7 rounded-[24px] border border-white/15 bg-white/[.07] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-white/55">
                Resumo do plano
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-lg font-extrabold">{selectedPlan.name}</p>
                  <p className="mt-1 text-xs font-semibold text-white/60">
                    {selectedPlan.cadence}
                  </p>
                </div>
                <p className="text-[28px] font-extrabold tracking-[-.05em]">
                  {formatPrice(selectedPlan.price)}
                </p>
              </div>
              <p className="mt-4 border-t border-white/15 pt-4 text-[11px] leading-5 text-white/55">
                A forma de pagamento é apenas uma preferência nesta etapa.
                Cobranças online ainda não estão habilitadas.
              </p>
            </div>
          </div>

          <form
            onSubmit={submitSignup}
            className="space-y-4 rounded-[30px] bg-[#f8f7f2] p-5 text-[#172321] shadow-[0_24px_70px_rgba(0,0,0,.18)] sm:p-7"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.17em] text-[#d7624c]">
                Quase lá
              </p>
              <h3 className="mt-1 text-[25px] font-extrabold tracking-[-.05em]">
                Seus dados de acesso
              </h3>
            </div>
            <div>
              <label
                htmlFor="signup-name"
                className="mb-2 block text-xs font-extrabold text-[#59645f]"
              >
                Nome completo
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label
                htmlFor="signup-email"
                className="mb-2 block text-xs font-extrabold text-[#59645f]"
              >
                E-mail
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder="seu@email.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block text-xs font-extrabold text-[#59645f]"
                >
                  Senha
                </label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="Mínimo de 8 caracteres"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-confirm"
                  className="mb-2 block text-xs font-extrabold text-[#59645f]"
                >
                  Confirmar senha
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                  placeholder="Repita sua senha"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-extrabold text-[#59645f]">
                Forma de pagamento preferida
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["cartao", "boleto"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={paymentMethod === method}
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
                      paymentMethod === method
                        ? "border-[#173e37] bg-[#edf4f2] text-[#173e37]"
                        : "border-[#dfded7] bg-white text-[#66736d]"
                    }`}
                  >
                    {method === "cartao" ? "Cartão" : "Boleto"}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-2xl border border-[#e2e0d9] bg-white p-3 text-left text-[11px] font-semibold leading-5 text-[#5f6e6a]">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#173e37]"
              />
              Li e aceito os termos de uso e a política de privacidade.
            </label>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <button
              type="submit"
              disabled={submitting}
              className="primary-button disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? "Criando sua conta..."
                : "Criar conta e iniciar teste grátis"}
            </button>
            <p className="text-center text-[10px] font-semibold leading-relaxed text-[#8a928f]">
              Nenhuma cobrança será feita durante o período de teste.
            </p>
          </form>
        </div>
      </section>

      <footer className="bg-[#f7f8f4] px-5 py-7">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 sm:flex-row">
          <Brand />
          <p className="text-center text-[10px] font-semibold text-[#89938d]">
            Gestão de temporada mais simples. © {new Date().getFullYear()}{" "}
            Staywise.
          </p>
          <button
            type="button"
            onClick={() => setView("login")}
            className="text-xs font-extrabold text-[#34705d]"
          >
            Já é cliente? Entrar
          </button>
        </div>
      </footer>
    </main>
  )
}

const inputClass =
  "w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold text-[#172321] outline-none transition placeholder:text-[#a8adaa] focus:border-[#34705d] focus:ring-2 focus:ring-[#34705d]/10"

function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#ed765f] text-sm font-extrabold text-white">
        S
      </span>
      <span
        className={`text-[19px] font-extrabold tracking-[-.055em] ${
          light ? "text-white" : "text-[#173e37]"
        }`}
      >
        staywise
      </span>
    </span>
  )
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
    >
      <path
        d="m3.5 8 3 3 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M16 8h3a1 1 0 0 1 1 1v12M8 7h4M8 11h4M8 15h4M3 21h18" />
    </svg>
  )
}

function ActivityItem({
  marker,

  title,

  detail,
}: {
  marker: string

  title: string

  detail: string
}) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${marker}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-extrabold">{title}</p>
        <p className="mt-0.5 text-[9px] font-semibold text-[#87918b]">
          {detail}
        </p>
      </div>
      <span aria-hidden="true" className="text-[#a7afaa]">
        ›
      </span>
    </div>
  )
}

function FeatureCard({
  number,

  title,

  description,

  tone,
}: {
  number: string

  title: string

  description: string

  tone: string
}) {
  return (
    <article className="rounded-[24px] border border-[#e7e9e3] bg-white p-5">
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] text-xs font-extrabold ${tone}`}
      >
        {number}
      </span>
      <h3 className="mt-5 text-[16px] font-extrabold tracking-[-.03em]">
        {title}
      </h3>
      <p className="mt-2 text-xs leading-5 text-[#7b8781]">{description}</p>
    </article>
  )
}

function StepCard({
  step,

  title,

  detail,
}: {
  step: string

  title: string

  detail: string
}) {
  return (
    <article className="rounded-[22px] border border-[#dfe5dd] bg-white p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#173e37] text-xs font-extrabold text-white">
        {step}
      </span>
      <h3 className="mt-4 text-sm font-extrabold">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-[#7b8781]">{detail}</p>
    </article>
  )
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-[#f1c8bd] bg-[#fff1ec] px-4 py-3 text-xs font-bold text-[#a84734]"
    >
      {children}
    </p>
  )
}
