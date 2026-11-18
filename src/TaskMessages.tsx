import { useEffect, useState, type FormEvent } from "react"

import { api } from "./api"

type TaskMessage = {
  id: string

  message: string

  sender_name: string

  sender_type: "proprietario_adm" | "prestador_servico"

  created_at: string
}

export default function TaskMessages({
  taskId,

  endpoint,

  legacyObservation,

  defaultOpen = false,
}: {
  taskId: string

  endpoint: "/operation/tasks" | "/provider/tasks"

  legacyObservation?: string | null

  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const [messages, setMessages] = useState<TaskMessage[]>([])

  const [draft, setDraft] = useState("")

  const [loading, setLoading] = useState(false)

  const [sending, setSending] = useState(false)

  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    let active = true
    setMessages([])
    setDraft("")
    setLoading(true)

    setError("")

    api<{ messages: TaskMessage[] }>(
      `${endpoint}/${encodeURIComponent(taskId)}/messages`,
    )

      .then((result) => {
        if (active) setMessages(result.messages)
      })

      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as mensagens.",
          )
        }
      })

      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [endpoint, open, taskId])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = draft.trim()

    if (!message) return

    setSending(true)

    setError("")

    try {
      const result = await api<{ message: TaskMessage }>(
        `${endpoint}/${encodeURIComponent(taskId)}/messages`,

        {
          method: "POST",

          body: JSON.stringify({ message }),
        },
      )

      setMessages((current) => [...current, result.message])

      setDraft("")
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a mensagem.",
      )
    } finally {
      setSending(false)
    }
  }

  const legacyText = legacyObservation?.trim()

  return (
    <section className="mt-4 rounded-xl bg-[#f7f8f4] p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left text-[10px] font-extrabold uppercase tracking-wide text-[#34705d]"
      >
        <span>Conversa da tarefa</span>
        <span className="text-[9px] font-bold normal-case tracking-normal text-[#7b8780]">
          {open ? "Recolher" : "Abrir"}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {loading && (
            <p className="py-2 text-xs text-[#7b8780]">
              Carregando mensagens...
            </p>
          )}
          {legacyText && (
            <article className="mb-2 rounded-xl border border-dashed border-[#d8d9d2] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-[10px] font-extrabold text-[#59645f]">
                  Observação anterior
                </p>
                <p className="text-[9px] font-semibold text-[#89938d]">
                  Autor e data/hora não registrados
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#59645f]">
                {legacyText}
              </p>
            </article>
          )}
          {messages.map((item) => (
            <article
              key={item.id}
              className="mb-2 rounded-xl border border-[#e4e6df] bg-white p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-[10px] font-extrabold text-[#20352f]">
                  {item.sender_name}
                  <span className="ml-1 font-semibold text-[#7b8780]">
                    ·{" "}
                    {item.sender_type === "proprietario_adm"
                      ? "Administrador"
                      : "Prestador de serviços"}
                  </span>
                </p>
                <time
                  dateTime={item.created_at}
                  className="text-[9px] font-semibold text-[#89938d]"
                >
                  {new Date(item.created_at).toLocaleString("pt-BR", {
                    dateStyle: "short",

                    timeStyle: "short",
                  })}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#59645f]">
                {item.message}
              </p>
            </article>
          ))}
          {!loading && !legacyText && messages.length === 0 && !error && (
            <p className="py-2 text-xs text-[#7b8780]">
              Nenhuma mensagem ainda. Inicie a conversa.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mb-2 text-xs font-semibold text-[#a84734]"
            >
              {error}
            </p>
          )}
          <form onSubmit={sendMessage} className="mt-3">
            <label className="block">
              <span className="sr-only">Escreva uma mensagem</span>
              <textarea
                value={draft}
                maxLength={5000}
                rows={3}
                onChange={(event) => setDraft(event.target.value)}
                className="w-full resize-y rounded-xl border border-[#dfe2db] bg-white px-3 py-2 text-xs outline-none focus:border-[#34705d]"
                placeholder="Escreva uma mensagem..."
              />
            </label>
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={sending || loading || !draft.trim()}
                className="rounded-lg bg-[#173e37] px-3 py-2 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
