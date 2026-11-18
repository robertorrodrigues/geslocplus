import { useEffect, useState } from "react"
import { api, type AppUser } from "./api"
import TaskMessages from "./TaskMessages"

type TaskStatus =
  | "iniciar"
  | "em_andamento"
  | "final_ok"
  | "final_prb"
  | "cancelada"

type ProviderTask = {
  id: string
  name: string
  observation: string | null
  provider_observation: string | null
  property_name: string
  start_at: string | null
  end_at: string | null
  status: TaskStatus
  provider_started: boolean
  images: { id: string; created_at: string }[]
  checklists: {
    id: string
    title: string
    items: {
      id: string
      title: string
      description: string | null
      rule: string | null
      done: boolean
    }[]
  }[]
}

const taskStatuses: { value: TaskStatus; label: string }[] = [
  { value: "iniciar", label: "Iniciar" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "final_ok", label: "Finalizada · OK" },
  { value: "final_prb", label: "Finalizada · com problema" },
  { value: "cancelada", label: "Cancelada" },
]

const statusLabel = (status: TaskStatus) =>
  taskStatuses.find((item) => item.value === status)?.label ?? status

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Não informado"

const readImageDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Não foi possível carregar a imagem."))
    }
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    reader.readAsDataURL(file)
  })

export default function ProviderHome({
  user,
  onLogout,
}: {
  user: AppUser
  onLogout: () => void
}) {
  const [tasks, setTasks] = useState<ProviderTask[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState("")
  const [error, setError] = useState("")
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null

  async function loadTasks() {
    setError("")
    try {
      const result = await api<{ tasks: ProviderTask[] }>("/provider/tasks")
      setTasks(result.tasks)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar suas tarefas.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTasks()
  }, [])

  async function updateStatus(taskId: string, status: TaskStatus) {
    setUpdating(true)
    setError("")
    try {
      await api(`/provider/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                provider_started: task.provider_started || status !== "iniciar",
              }
            : task,
        ),
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o status.",
      )
    } finally {
      setUpdating(false)
    }
  }

  async function updateChecklistItem(
    taskId: string,
    itemId: string,
    completed: boolean,
  ) {
    setUpdating(true)
    setError("")
    try {
      await api(
        `/provider/tasks/${encodeURIComponent(taskId)}/checklist-items/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ completed }),
        },
      )
      setTasks((current) =>
        current.map((task) =>
          task.id !== taskId
            ? task
            : {
                ...task,
                status: "em_andamento",
                provider_started: true,
                checklists: task.checklists.map((checklist) => ({
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId ? { ...item, done: completed } : item,
                  ),
                })),
              },
        ),
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o checklist.",
      )
    } finally {
      setUpdating(false)
    }
  }

  async function uploadImage(taskId: string, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Selecione uma imagem JPEG, PNG ou WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.")
      return
    }

    setUploadingImage(true)
    setError("")
    setSavedMessage("")
    try {
      const imageDataUrl = await readImageDataUrl(file)
      const result = await api<{
        image: { id: string; created_at: string }
      }>(`/provider/tasks/${encodeURIComponent(taskId)}/images`, {
        method: "POST",
        body: JSON.stringify({ imageDataUrl }),
      })
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, images: [result.image, ...task.images] }
            : task,
        ),
      )
      setSavedMessage("Imagem adicionada à tarefa.")
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a imagem.",
      )
    } finally {
      setUploadingImage(false)
    }
  }

  function openTask(task: ProviderTask) {
    setSelectedTaskId(task.id)
    setSavedMessage("")
    setError("")
  }

  function backToProperties() {
    setSelectedTaskId(null)
    setSavedMessage("")
    setError("")
  }

  return (
    <main className="min-h-dvh bg-[#e8e9e4] text-[#172321]">
      <div className="mx-auto min-h-dvh max-w-[760px] bg-[#f8f7f2] px-5 pb-12 pt-6 shadow-[0_0_60px_rgba(22,35,33,.12)] sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[.14em] text-[#34705d]">
              STAYWISE · PRESTADOR
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">
              {selectedTask ? "Checklist da tarefa" : "Imóveis para trabalhar"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#78817c]">
              Olá, {user.fullName}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {selectedTask && (
              <button
                type="button"
                onClick={backToProperties}
                className="rounded-xl border border-[#dfe2db] bg-white px-4 py-2.5 text-xs font-extrabold text-[#34705d]"
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-[#dfe2db] bg-white px-4 py-2.5 text-xs font-extrabold text-[#34705d]"
            >
              Sair
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[#f1c8bd] bg-[#fff1ec] p-4 text-sm font-bold text-[#a84734]"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="ml-2 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {loading ? (
          <p className="text-sm font-semibold text-[#78817c]">
            Carregando tarefas...
          </p>
        ) : !tasks.length ? (
          <div className="rounded-[24px] border border-[#e5e3dc] bg-white p-6 text-center">
            <p className="font-extrabold">Nenhuma tarefa atribuída</p>
            <p className="mt-2 text-sm font-medium text-[#78817c]">
              As tarefas atribuídas a você aparecerão aqui.
            </p>
          </div>
        ) : selectedTask ? (
          <article className="rounded-[24px] border border-[#e5e3dc] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#34705d]">
              {selectedTask.property_name}
            </p>
            <h2 className="mt-1 text-xl font-extrabold">{selectedTask.name}</h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#68736d]">
                Início: {formatDate(selectedTask.start_at)}
              </p>
              <label className="flex items-center gap-2 text-xs font-bold text-[#59645f]">
                Status
                <select
                  aria-label={`Status da tarefa ${selectedTask.name}`}
                  value={selectedTask.status}
                  disabled={updating}
                  onChange={(event) =>
                    void updateStatus(
                      selectedTask.id,
                      event.target.value as TaskStatus,
                    )
                  }
                  className="rounded-xl border border-[#dfe2db] bg-[#f8f7f2] px-3 py-2 text-xs font-extrabold text-[#34705d] disabled:opacity-60"
                >
                  {taskStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selectedTask.observation && (
              <p className="mt-4 rounded-xl bg-[#f8f7f2] p-3 text-sm leading-relaxed text-[#59645f]">
                <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-[#78817c]">
                  Orientação do administrador
                </span>
                {selectedTask.observation}
              </p>
            )}
            {selectedTask.status !== "iniciar" && (
              <TaskMessages
                taskId={selectedTask.id}
                endpoint="/provider/tasks"
                legacyObservation={selectedTask.provider_observation}
                defaultOpen
              />
            )}
            {(selectedTask.status !== "iniciar" || !!selectedTask.images.length) && (
              <section className="mt-5 border-t border-[#eeece6] pt-4">
                <h3 className="text-sm font-extrabold">
                  Imagens de evidência ({selectedTask.images.length}/10)
                </h3>
                {selectedTask.status !== "iniciar" && (
                  <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-[#dfe2db] bg-[#f8f7f2] px-4 py-2.5 text-xs font-extrabold text-[#34705d]">
                    {uploadingImage ? "Enviando..." : "Adicionar imagem"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingImage || selectedTask.images.length >= 10}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0]
                        event.currentTarget.value = ""
                        if (file) void uploadImage(selectedTask.id, file)
                      }}
                      className="sr-only"
                    />
                  </label>
                )}
                {!!selectedTask.images.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTask.images.map((image, index) => (
                      <a
                        key={image.id}
                        href={`/api/provider/tasks/${encodeURIComponent(selectedTask.id)}/images/${encodeURIComponent(image.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-20 w-20 overflow-hidden rounded-xl border border-[#dfe2db]"
                      >
                        <img
                          src={`/api/provider/tasks/${encodeURIComponent(selectedTask.id)}/images/${encodeURIComponent(image.id)}`}
                          alt={`Evidência ${index + 1} da tarefa`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}
            {selectedTask.checklists.map((checklist) => (
              <section
                key={checklist.id}
                className="mt-5 border-t border-[#eeece6] pt-4"
              >
                <h3 className="text-sm font-extrabold">{checklist.title}</h3>
                <div className="mt-2 space-y-2">
                  {checklist.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f8f7f2] p-3"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={updating}
                        onChange={(event) =>
                          void updateChecklistItem(
                            selectedTask.id,
                            item.id,
                            event.target.checked,
                          )
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#173e37]"
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-bold ${
                            item.done
                              ? "text-[#8a928f] line-through"
                              : "text-[#384540]"
                          }`}
                        >
                          {item.title}
                        </span>
                        {(item.description || item.rule) && (
                          <span className="mt-1 block text-xs leading-relaxed text-[#78817c]">
                            {[item.description, item.rule]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                  {!checklist.items.length && (
                    <p className="text-xs text-[#78817c]">
                      Este checklist não contém itens.
                    </p>
                  )}
                </div>
              </section>
            ))}
            {!selectedTask.checklists.length && (
              <p className="mt-5 rounded-xl bg-[#f8f7f2] p-3 text-sm text-[#78817c]">
                Esta tarefa não possui checklists associados.
              </p>
            )}
          </article>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => openTask(task)}
                className="w-full rounded-[22px] border border-[#e5e3dc] bg-white p-5 text-left shadow-sm transition hover:border-[#9cb5ab]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold">{task.property_name}</p>
                    <p className="mt-1 text-sm font-bold text-[#59645f]">
                      {task.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#e7f0eb] px-3 py-1 text-[10px] font-extrabold text-[#34705d]">
                    {statusLabel(task.status)}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-[#68736d]">
                  <span>Início: {formatDate(task.start_at)}</span>
                  <span className="font-extrabold text-[#34705d]">
                    Abrir checklist →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
