import { useState, type FormEvent } from "react"
import { api, type AppUser } from "./api"

export default function PasswordChange({
  user,
  onChanged,
  onLogout,
}: {
  user: AppUser
  onChanged: (user: AppUser) => void
  onLogout: () => void
}) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (password !== confirmation) {
      setError("As senhas devem coincidir.")
      return
    }

    setSaving(true)
    try {
      const result = await api<{ user: AppUser }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: password }),
      })
      onChanged(result.user)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível alterar a senha.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#e8e9e4] p-5 text-[#172321]">
      <section className="w-full max-w-[440px] overflow-hidden rounded-[30px] border border-[#e7e9e3] bg-white shadow-[0_24px_70px_rgba(22,35,33,.12)]">
        <div className="bg-[#173e37] px-8 pb-8 pt-9 text-white">
          <p className="text-sm font-extrabold tracking-[.12em]">STAYWISE</p>
          <p className="mt-9 text-xs font-bold uppercase tracking-[.2em] text-white/60">
            Primeiro acesso
          </p>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-[-.05em]">
            Crie sua nova senha
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Por segurança, altere a senha temporária antes de continuar.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5 p-8">
          <p className="text-sm font-bold text-[#48645d]">{user.fullName}</p>
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-xs font-extrabold text-[#59645f]"
            >
              Nova senha
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#dfe2db] px-4 py-3 text-sm outline-none focus:border-[#34705d]"
              placeholder="Mínimo de 12 caracteres"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-new-password"
              className="mb-2 block text-xs font-extrabold text-[#59645f]"
            >
              Confirme a nova senha
            </label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-xl border border-[#dfe2db] px-4 py-3 text-sm outline-none focus:border-[#34705d]"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#f1c8bd] bg-[#fff1ec] px-3 py-2 text-xs font-bold text-[#a84734]"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#ed765f] px-4 py-3 text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 text-xs font-extrabold text-[#34705d]"
          >
            Sair da plataforma
          </button>
        </form>
      </section>
    </main>
  )
}
