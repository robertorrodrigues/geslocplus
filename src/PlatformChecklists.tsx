import { useEffect, useState, type FormEvent } from "react"

import { api } from "./api"

type ChecklistItem = {
  id: string

  title: string
}

type Checklist = {
  id: string

  title: string

  items: ChecklistItem[]
}

export default function PlatformChecklists() {
  const [checklists, setChecklists] = useState<Checklist[]>([])

  const [title, setTitle] = useState("")

  const [itemsText, setItemsText] = useState("")

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  async function loadChecklists() {
    setLoading(true)

    setError("")

    try {
      const result = await api<{ checklists: Checklist[] }>(
        "/platform/checklists",
      )

      setChecklists(result.checklists)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar os checklists padrão.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadChecklists()
  }, [])

  async function createChecklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    setNotice("")

    const items = itemsText

      .split(/\r?\n/)

      .map((item) => item.trim())

      .filter(Boolean)

    const checklistTitle = title.trim()
    if (checklistTitle.length < 2) {
      setError("O nome do checklist deve ter pelo menos 2 caracteres.")
      return
    }

    if (!items.length) {
      setError("Adicione ao menos um item ao checklist.")

      return
    }

    if (items.length > 50) {
      setError("Cada checklist pode ter no máximo 50 itens.")

      return
    }

    if (items.some((item) => item.length > 160)) {
      setError("Cada item do checklist pode ter no máximo 160 caracteres.")
      return
    }

    setSaving(true)

    try {
      await api("/platform/checklists", {
        method: "POST",

        body: JSON.stringify({ title: checklistTitle, items }),
      })

      setTitle("")

      setItemsText("")

      await loadChecklists()

      setNotice(
        "Checklist padrão criado e compartilhado com os administradores.",
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o checklist.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-[28px] border border-[#e1e4dc] bg-[#f8f7f2] p-5 shadow-[0_14px_38px_rgba(22,35,33,.06)] sm:p-7">
        <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#d7624c]">
          Biblioteca compartilhada
        </p>
        <h2 className="mt-2 text-[26px] font-extrabold tracking-[-.05em] text-[#172321]">
          Criar checklist padrão
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#748079]">
          Os checklists padrão e seus itens ficarão disponíveis para todos os
          administradores.
        </p>

        <form onSubmit={createChecklist} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="standard-checklist-title"
              className="mb-2 block text-xs font-extrabold text-[#59645f]"
            >
              Nome do checklist
            </label>
            <input
              id="standard-checklist-title"
              required
              minLength={2}
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold text-[#172321] outline-none transition placeholder:text-[#a8adaa] focus:border-[#34705d] focus:ring-2 focus:ring-[#34705d]/10"
              placeholder="Ex.: Preparação para check-in"
            />
          </div>
          <div>
            <label
              htmlFor="standard-checklist-items"
              className="mb-2 block text-xs font-extrabold text-[#59645f]"
            >
              Itens, um por linha
            </label>
            <textarea
              id="standard-checklist-items"
              required
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              rows={7}
              className="w-full resize-y rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold text-[#172321] outline-none transition placeholder:text-[#a8adaa] focus:border-[#34705d] focus:ring-2 focus:ring-[#34705d]/10"
              placeholder={
                "Conferir as chaves\nVerificar a limpeza\nPreparar os itens de boas-vindas"
              }
            />
            <p className="mt-2 text-[10px] font-semibold text-[#89938d]">
              Informe de 1 a 50 itens; linhas vazias serão ignoradas.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-[#f1c8bd] bg-[#fff1ec] px-4 py-3 text-xs font-bold text-[#a84734]"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-2xl border border-[#d7e8dd] bg-[#edf6f0] px-4 py-3 text-xs font-bold text-[#34705d]"
            >
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-[#173e37] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#24574c] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Criando..." : "Criar e compartilhar"}
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-[#e1e4dc] bg-[#f8f7f2] p-5 shadow-[0_14px_38px_rgba(22,35,33,.06)] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#d7624c]">
              Disponíveis para todos
            </p>
            <h2 className="mt-2 text-[26px] font-extrabold tracking-[-.05em] text-[#172321]">
              Checklists padrão
            </h2>
          </div>
          <span className="rounded-full bg-[#edf4ef] px-3 py-1.5 text-[10px] font-extrabold text-[#34705d]">
            {checklists.length}
          </span>
        </div>

        {loading ? (
          <p className="mt-6 text-xs font-semibold text-[#89938d]">
            Carregando checklists...
          </p>
        ) : error && !checklists.length ? (
          <div className="mt-5">
            <p className="text-xs font-bold text-[#a84734]">{error}</p>
            <button
              type="button"
              onClick={() => void loadChecklists()}
              className="mt-3 text-xs font-extrabold text-[#34705d] underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : checklists.length ? (
          <div className="mt-5 space-y-3">
            {checklists.map((checklist) => (
              <article
                key={checklist.id}
                className="rounded-[20px] border border-[#e5e8e1] bg-white p-4"
              >
                <h3 className="text-sm font-extrabold text-[#25342e]">
                  {checklist.title}
                </h3>
                <ol className="mt-3 space-y-2 border-t border-[#eef0ea] pt-3">
                  {checklist.items.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2.5 text-xs font-semibold text-[#65726c]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f0f3ee] text-[9px] font-extrabold text-[#61766d]">
                        {index + 1}
                      </span>
                      {item.title}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-[#d6dbd3] bg-white px-4 py-7 text-center text-xs font-semibold text-[#89938d]">
            Nenhum checklist padrão criado até agora.
          </p>
        )}
      </section>
    </div>
  )
}
