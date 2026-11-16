import { useEffect, useState, type FormEvent } from "react"

import { api, type AppUser } from "./api"
import PlatformChecklists from "./PlatformChecklists"

type Administrator = {
  id: string

  full_name: string

  email: string | null

  phone: string | null

  cpf_cnpj: string | null

  has_account: boolean
}

type AdministratorForm = {
  fullName: string

  email: string

  phone: string

  cpfCnpj: string
}

const emptyForm: AdministratorForm = {
  fullName: "",

  email: "",

  phone: "",

  cpfCnpj: "",
}

const toForm = (administrator: Administrator): AdministratorForm => ({
  fullName: administrator.full_name,

  email: administrator.email || "",

  phone: administrator.phone || "",

  cpfCnpj: administrator.cpf_cnpj || "",
})

export default function PlatformAdminHome({
  user,

  onLogout,
}: {
  user: AppUser

  onLogout: () => void
}) {
  const [section, setSection] = useState<"administrators" | "checklists">(
    "administrators",
  )

  const [administrators, setAdministrators] = useState<Administrator[]>([])

  const [selectedId, setSelectedId] = useState("")

  const [form, setForm] = useState(emptyForm)

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState(false)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  const selected = administrators.find((item) => item.id === selectedId) || null

  async function loadAdministrators() {
    setLoading(true)

    setError("")

    try {
      const result = await api<{ administrators: Administrator[] }>(
        "/platform/administrators",
      )

      setAdministrators(result.administrators)

      const current =
        result.administrators.find((item) => item.id === selectedId) ||
        result.administrators[0]

      setSelectedId(current?.id || "")

      setForm(current ? toForm(current) : emptyForm)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar os administradores.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAdministrators()
  }, [])

  function chooseAdministrator(id: string) {
    setSelectedId(id)

    setEditing(false)

    setError("")

    setNotice("")

    const administrator = administrators.find((item) => item.id === id)

    setForm(administrator ? toForm(administrator) : emptyForm)
  }

  async function saveAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selected) return

    setSaving(true)

    setError("")

    setNotice("")

    try {
      const result = await api<{ administrator: Administrator }>(
        `/platform/administrators/${encodeURIComponent(selected.id)}`,

        {
          method: "PATCH",

          body: JSON.stringify(form),
        },
      )

      setAdministrators((current) =>
        current.map((item) =>
          item.id === selected.id ? result.administrator : item,
        ),
      )

      setForm(toForm(result.administrator))

      setEditing(false)

      setNotice("Dados do administrador atualizados.")
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar as alterações.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#e8e9e4] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[980px]">
        <header className="flex items-center justify-between rounded-[28px] bg-[#173e37] px-5 py-5 text-white shadow-[0_16px_40px_rgba(23,62,55,.16)] sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-extrabold">
              S
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-white/55">
                Staywise
              </p>
              <h1 className="text-lg font-extrabold tracking-[-.03em]">
                Administração da plataforma
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-right text-xs font-semibold text-white/70 sm:block">
              {user.fullName}
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-white/20 px-3 py-2 text-[10px] font-extrabold text-white transition hover:bg-white/10 sm:px-4 sm:text-xs"
            >
              Sair
            </button>
          </div>
        </header>

        <nav
          aria-label="Seções da administração da plataforma"
          className="mt-5 flex rounded-2xl border border-[#dfe2db] bg-[#f8f7f2] p-1"
        >
          <button
            type="button"
            aria-pressed={section === "administrators"}
            onClick={() => setSection("administrators")}
            className={`flex-1 rounded-xl px-3 py-3 text-xs font-extrabold transition ${
              section === "administrators"
                ? "bg-[#173e37] text-white shadow-sm"
                : "text-[#697670] hover:bg-white"
            }`}
          >
            Administradores
          </button>
          <button
            type="button"
            aria-pressed={section === "checklists"}
            onClick={() => setSection("checklists")}
            className={`flex-1 rounded-xl px-3 py-3 text-xs font-extrabold transition ${
              section === "checklists"
                ? "bg-[#173e37] text-white shadow-sm"
                : "text-[#697670] hover:bg-white"
            }`}
          >
            Checklists padrão
          </button>
        </nav>

        {section === "administrators" ? (
          <section className="mt-4 rounded-[28px] border border-[#e1e4dc] bg-[#f8f7f2] p-5 shadow-[0_14px_38px_rgba(22,35,33,.06)] sm:p-8">
            <div className="max-w-[660px]">
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#d7624c]">
                Visão geral
              </p>
              <h2 className="mt-2 text-[30px] font-extrabold tracking-[-.05em] text-[#172321] sm:text-[36px]">
                Administradores
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#748079]">
                Consulte e edite os dados dos administradores cadastrados na
                plataforma.
              </p>
            </div>

            <div className="mt-7 max-w-[580px]">
              <label
                htmlFor="administrator-selector"
                className="mb-2 block text-xs font-extrabold text-[#59645f]"
              >
                Selecionar administrador
              </label>
              <select
                id="administrator-selector"
                value={selectedId}
                onChange={(event) => chooseAdministrator(event.target.value)}
                disabled={loading || administrators.length === 0}
                className="w-full rounded-2xl border border-[#dfe2db] bg-white px-4 py-3.5 text-sm font-bold text-[#23312d] outline-none transition focus:border-[#34705d] focus:ring-2 focus:ring-[#34705d]/10 disabled:opacity-60"
              >
                <option value="">
                  {loading ? "Carregando administradores..." : "Selecione..."}
                </option>
                {administrators.map((administrator) => (
                  <option key={administrator.id} value={administrator.id}>
                    {administrator.full_name}
                    {administrator.email ? ` · ${administrator.email}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] font-semibold text-[#89938d]">
                {loading
                  ? "Buscando cadastros..."
                  : `${administrators.length} ${
                      administrators.length === 1
                        ? "administrador encontrado"
                        : "administradores encontrados"
                    }`}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f1c8bd] bg-[#fff1ec] px-4 py-3 text-xs font-bold text-[#a84734]"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => void loadAdministrators()}
                  className="underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {notice && (
              <p
                role="status"
                className="mt-5 rounded-2xl border border-[#d7e8dd] bg-[#edf6f0] px-4 py-3 text-xs font-bold text-[#34705d]"
              >
                {notice}
              </p>
            )}

            {!loading && !error && !selected && (
              <div className="mt-7 rounded-2xl border border-dashed border-[#d6dbd3] bg-white px-5 py-8 text-center">
                <p className="text-sm font-extrabold text-[#33413c]">
                  Nenhum administrador cadastrado
                </p>
                <p className="mt-2 text-xs text-[#89938d]">
                  Os cadastros aparecerão aqui assim que forem criados.
                </p>
              </div>
            )}

            {selected && (
              <section className="mt-7 overflow-hidden rounded-[24px] border border-[#e3e5de] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceee9] px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#87918b]">
                      Dados do administrador
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-[#66736d]">
                      {selected.has_account
                        ? "Conta de acesso ativa"
                        : "Cadastro sem conta de acesso"}
                    </p>
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(toForm(selected))

                        setEditing(true)

                        setError("")

                        setNotice("")
                      }}
                      className="rounded-full bg-[#173e37] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#24574c]"
                    >
                      Editar dados
                    </button>
                  )}
                </div>

                {editing ? (
                  <form
                    onSubmit={saveAdministrator}
                    className="space-y-4 p-5 sm:p-6"
                  >
                    <FormField
                      id="administrator-name"
                      label="Nome completo"
                      value={form.fullName}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, fullName: value }))
                      }
                      required
                      maxLength={160}
                    />
                    <FormField
                      id="administrator-email"
                      label="E-mail"
                      value={form.email}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, email: value }))
                      }
                      type="email"
                      required={selected.has_account}
                      maxLength={254}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        id="administrator-phone"
                        label="Telefone"
                        value={form.phone}
                        onChange={(value) =>
                          setForm((current) => ({ ...current, phone: value }))
                        }
                        maxLength={40}
                      />
                      <FormField
                        id="administrator-document"
                        label="CPF / CNPJ"
                        value={form.cpfCnpj}
                        onChange={(value) =>
                          setForm((current) => ({ ...current, cpfCnpj: value }))
                        }
                        maxLength={30}
                      />
                    </div>
                    {selected.has_account && (
                      <p className="rounded-xl bg-[#f1f5f1] px-4 py-3 text-[11px] leading-5 text-[#65736c]">
                        Alterar o nome ou e-mail também atualizará os dados de
                        acesso desta conta.
                      </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setForm(toForm(selected))

                          setEditing(false)

                          setError("")
                        }}
                        disabled={saving}
                        className="rounded-full border border-[#dfe2db] px-5 py-3 text-xs font-extrabold text-[#59645f] transition hover:bg-[#f5f6f2] disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-full bg-[#ed765f] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#df6954] disabled:cursor-wait disabled:opacity-60"
                      >
                        {saving ? "Salvando..." : "Salvar alterações"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                    <Detail label="Nome completo" value={selected.full_name} />
                    <Detail label="E-mail" value={selected.email} />
                    <Detail label="Telefone" value={selected.phone} />
                    <Detail label="CPF / CNPJ" value={selected.cpf_cnpj} />
                  </div>
                )}
              </section>
            )}
          </section>
        ) : (
          <PlatformChecklists />
        )}
      </div>
    </main>
  )
}

function FormField({
  id,

  label,

  value,

  onChange,

  type = "text",

  required = false,

  maxLength,
}: {
  id: string

  label: string

  value: string

  onChange: (value: string) => void

  type?: "text" | "email"

  required?: boolean

  maxLength: number
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-extrabold text-[#59645f]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3 text-sm font-semibold text-[#172321] outline-none transition placeholder:text-[#a8adaa] focus:border-[#34705d] focus:ring-2 focus:ring-[#34705d]/10"
      />
    </div>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#929c96]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-[#26332f]">
        {value || "Não informado"}
      </p>
    </div>
  )
}
