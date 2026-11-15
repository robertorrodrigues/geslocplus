import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { api, ApiError, initials, type AppUser } from "./api"
import Login from "./Login"

type IconName = "home" | "building" | "check" | "users" | "bell" | "chevron" | "arrow" | "calendar" | "clock" | "pin" | "more" | "plus" | "search" | "filter" | "bed" | "sparkle" | "tool" | "key" | "wallet" | "briefcase" | "close" | "userPlus" | "clipboard"

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M16 8h3a1 1 0 0 1 1 1v12M8 7h4M8 11h4M8 15h4M3 21h18" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18v-7h18v7M3 15h18M6 11V7h5a3 3 0 0 1 3 3v1M3 20v-2M21 20v-2" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15ZM19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6L19 13Z" />
    </>
  ),
  tool: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L20 16.4a2 2 0 0 1-2.8 2.8L9.5 11.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M15 8l2 2M18 5l2 2" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 5h14a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12" />
      <path d="M20 11h-5a2 2 0 0 0 0 4h5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  userPlus: (
    <>
      <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8" cy="7" r="4" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" />
    </>
  ),
}

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

type Property = {
  id: string
  name: string
  address: string
  postalCode: string
  city: string
  state: string
  location: string
  status: string
  next: string
  image: string
  imageUrl: string | null
  equipmentCount: number
  owners: { id: string; name: string }[]
}

type Task = {
  id: string
  icon: IconName
  title: string
  place: string
  time: string
  tone: string
  done: boolean
  category: string
}

type Person = {
  id: string
  name: string
  initials: string
  role: string
  detail: string
  color: string
  kind: "administrator" | "proxy" | "provider"
}

type Dashboard = {
  properties: number
  pendingTasks: number
  completedTasks: number
}

type PropertyResponse = {
  id: string
  name: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  state: string | null
  image_url: string | null
  equipment_count: number
  owners: { id: string; name: string }[]
}

type EquipmentPhoto = {
  id: string
  url: string
}

type EquipmentRecord = {
  id: string
  name: string
  description: string
  observation: string
  photos: EquipmentPhoto[]
}

type PersonResponse = {
  id: string
  full_name: string
  kind: Person["kind"]
}

type TaskResponse = {
  id: string
  title: string
  category: string
  due_at: string | null
  property_name: string
  done: boolean
}

const emptyDashboard: Dashboard = {
  properties: 0,
  pendingTasks: 0,
  completedTasks: 0,
}

const fallbackImage =
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80"

const taskAppearance: Record<string, { icon: IconName; tone: string }> = {
  check_in: { icon: "key", tone: "purple" },
  check_out: { icon: "bed", tone: "orange" },
  cleaning: { icon: "sparkle", tone: "green" },
  inspection: { icon: "clipboard", tone: "green" },
  maintenance: { icon: "tool", tone: "orange" },
  other: { icon: "check", tone: "green" },
}

const formatTaskTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sem horário"

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

type Tab = "home" | "properties" | "operation" | "people"

export default function App() {
  const [tab, setTab] = useState<Tab>("home")
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState("")
  const [properties, setProperties] = useState<Property[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  )
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [equipmentProperty, setEquipmentProperty] = useState<Property | null>(
    null,
  )
  const [showAdd, setShowAdd] = useState(false)
  const [notice, setNotice] = useState("")
  const [personFilter, setPersonFilter] = useState("Todos")
  const [operationFilter, setOperationFilter] = useState("Hoje")

  useEffect(() => {
    api<{ user: AppUser | null }>("/auth/me")
      .then(({ user: sessionUser }) => {
        if (sessionUser) setUser(sessionUser)
      })
      .catch((error: unknown) => {
        setAuthMessage(
          error instanceof ApiError && error.status !== 401
            ? error.message
            : "Não foi possível conectar à API. Verifique se o servidor está em execução.",
        )
      })
      .finally(() => setAuthLoading(false))
  }, [])

  async function loadAppData() {
    setDataLoading(true)
    setDataError("")
    try {
      const [propertyResult, peopleResult, taskResult, summary] =
        await Promise.all([
          api<{ properties: PropertyResponse[] }>("/properties"),
          api<{ people: PersonResponse[] }>("/people"),
          api<{ tasks: TaskResponse[] }>("/tasks"),
          api<Dashboard>("/dashboard"),
        ])
      setProperties(
        propertyResult.properties.map((item) => {
          return {
            id: item.id,
            name: item.name || "",
            address: item.address || "",
            postalCode: item.postal_code || "",
            city: item.city || "",
            state: item.state || "",
            location:
              [item.city, item.state].filter(Boolean).join(", ") ||
              item.address ||
              "",
            status: "Cadastrado",
            next: "Acompanhe a operação",
            image: item.image_url || fallbackImage,
            imageUrl: item.image_url,
            equipmentCount: Number(item.equipment_count || 0),
            owners: item.owners,
          }
        }),
      )
      setPeople(
        peopleResult.people.map((item) => {
          const roles: Record<Person["kind"], string> = {
            administrator: "Administrador",
            proxy: "Preposto",
            provider: "Prestador de serviços",
          }
          return {
            id: item.id,
            name: item.full_name,
            initials: initials(item.full_name),
            role: roles[(item.kind as Person["kind"])],
            detail: "Cadastro sem vínculo com imóvel",
            color:
              item.kind === "administrator"
                ? "coral"
                : item.kind === "proxy"
                  ? "green"
                  : "purple",
            kind: item.kind,
          }
        }),
      )
      setTasks(
        taskResult.tasks.map((item) => ({
          id: item.id,
          icon: taskAppearance[item.category]?.icon || "check",
          title: item.title,
          place: item.property_name,
          time: formatTaskTime(item.due_at),
          tone: taskAppearance[item.category]?.tone || "green",
          done: item.done,
          category: item.category,
        })),
      )
      setDashboard({
        properties: Number(summary.properties),
        pendingTasks: Number(summary.pendingTasks),
        completedTasks: Number(summary.completedTasks),
      })
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Falha ao carregar os dados.",
      )
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (user) void loadAppData()
  }, [user])

  async function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    try {
      await api(`/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.done }),
      })
      setTasks((current) =>
        current.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item,
        ),
      )
      setDashboard((current) => ({
        ...current,
        completedTasks: Math.max(
          0,
          current.completedTasks + (task.done ? -1 : 1),
        ),
        pendingTasks: Math.max(0, current.pendingTasks + (task.done ? 1 : -1)),
      }))
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a tarefa.",
      )
    }
  }

  async function saveRecord(data: Record<string, unknown>, recordId?: string) {
    const path =
      recordId || tab === "properties"
        ? `/properties${recordId ? `/${encodeURIComponent(recordId)}` : ""}`
        : tab === "operation"
          ? "/checklists"
          : "/people"
    await api(path, {
      method: recordId ? "PATCH" : "POST",
      body: JSON.stringify(data),
    })
    setShowAdd(false)
    setEditingProperty(null)
    flash(
      recordId
        ? "Imóvel atualizado com sucesso."
        : "Cadastro salvo com sucesso.",
    )
    await loadAppData()
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" })
      setUser(null)
      setProperties([])
      setPeople([])
      setTasks([])
      setDashboard(emptyDashboard)
    } catch (error) {
      flash(error instanceof Error ? error.message : "Não foi possível sair.")
    }
  }

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(""), 2400)
  }

  const heading = useMemo(
    () =>
      ({
        home: "",
        properties: "Meus imóveis",
        operation: "Operação",
        people: "Pessoas",
      })[tab],
    [tab],
  )

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e4] text-sm font-bold text-[#48645d]">
        Carregando...
      </div>
    )
  }
  if (!user) {
    return (
      <Login
        onLogin={(signedInUser) => {
          setAuthMessage("")
          setUser(signedInUser)
        }}
        message={authMessage}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-[#e8e9e4] text-[#172321]">
      <main className="relative mx-auto min-h-dvh w-full max-w-[460px] overflow-hidden bg-[#f8f7f2] shadow-[0_0_60px_rgba(22,35,33,.12)]">
        {notice && (
          <div className="fixed left-1/2 top-5 z-[80] -translate-x-1/2 rounded-full bg-[#172f2b] px-5 py-3 text-sm font-bold text-white shadow-xl animate-toast">
            {notice}
          </div>
        )}

        {tab === "home" ? (
          <HomeHeader
            userName={user.fullName}
            onBell={() => flash("Você está em dia por aqui.")}
            onLogout={logout}
          />
        ) : (
          <PageHeader
            title={heading}
            onBell={() => flash("Nenhuma nova notificação.")}
            onLogout={logout}
          />
        )}

        <div className="pb-28">
          {dataError && (
            <div
              className="mx-5 mb-4 rounded-2xl border border-[#f1c8bd] bg-[#fff1ec] p-4 text-xs font-bold text-[#a84734]"
              role="alert"
            >
              {dataError}
              <button
                onClick={() => void loadAppData()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}
          {dataLoading && (
            <p className="mx-5 mb-3 text-xs font-bold text-[#8a928f]">
              Atualizando informações...
            </p>
          )}
          {tab === "home" && (
            <HomeScreen
              tasks={tasks}
              properties={properties}
              dashboard={dashboard}
              onToggleTask={toggleTask}
              onProperty={setSelectedProperty}
              onSeeOperation={() => setTab("operation")}
              onSeeProperties={() => setTab("properties")}
            />
          )}
          {tab === "properties" && (
            <PropertiesScreen
              properties={properties}
              dashboard={dashboard}
              onSelect={setSelectedProperty}
              onAdd={() => setShowAdd(true)}
            />
          )}
          {tab === "operation" && (
            <OperationScreen
              tasks={tasks}
              filter={operationFilter}
              setFilter={setOperationFilter}
              onToggleTask={toggleTask}
              onAdd={() => setShowAdd(true)}
            />
          )}
          {tab === "people" && (
            <PeopleScreen
              filter={personFilter}
              setFilter={setPersonFilter}
              people={people}
              onAdd={() => setShowAdd(true)}
            />
          )}
        </div>

        <BottomNav active={tab} setActive={setTab} />
        {selectedProperty && (
          <PropertyDetail
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
            onManageEquipment={() => setEquipmentProperty(selectedProperty)}
            onEdit={() => {
              setEditingProperty(selectedProperty)
              setSelectedProperty(null)
            }}
          />
        )}
        {(showAdd || editingProperty) && (
          <AddSheet
            context={editingProperty ? "properties" : tab}
            people={people}
            initialProperty={editingProperty || undefined}
            onManageEquipment={setEquipmentProperty}
            onClose={() => {
              setShowAdd(false)
              setEditingProperty(null)
            }}
            onSave={saveRecord}
          />
        )}
        {equipmentProperty && (
          <EquipmentPage
            key={equipmentProperty.id}
            property={equipmentProperty}
            onBack={(equipmentCount) => {
              const propertyId = equipmentProperty.id
              setProperties((current) =>
                current.map((property) =>
                  property.id === propertyId
                    ? { ...property, equipmentCount }
                    : property,
                ),
              )
              setEditingProperty((current) =>
                current?.id === propertyId
                  ? { ...current, equipmentCount }
                  : current,
              )
              setSelectedProperty((current) =>
                current?.id === propertyId
                  ? { ...current, equipmentCount }
                  : current,
              )
              setEquipmentProperty(null)
            }}
          />
        )}
      </main>
    </div>
  )
}

function HomeHeader({
  userName,
  onBell,
  onLogout,
}: {
  userName: string
  onBell: () => void
  onLogout: () => void
}) {
  const userInitials = initials(userName)
  return (
    <header className="px-5 pb-5 pt-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar bg-[#ed765f] text-white">{userInitials}</div>
          <div>
            <p className="text-xs font-semibold text-[#7c8581]">Bom dia,</p>
            <h1 className="text-[19px] font-extrabold tracking-[-.03em]">
              {userName}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBell}
            className="icon-button"
            aria-label="Notificações"
          >
            <Icon name="bell" size={21} />
          </button>
          <button
            onClick={onLogout}
            className="rounded-xl border border-[#e4e3dc] bg-white px-3 text-[10px] font-extrabold text-[#59645f]"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}

function PageHeader({
  title,
  onBell,
  onLogout,
}: {
  title: string
  onBell: () => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-[#f8f7f2]/95 px-5 pb-4 pt-7 backdrop-blur-md">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#8e9692]">
          Staywise
        </p>
        <h1 className="text-[27px] font-extrabold tracking-[-.05em]">
          {title}
        </h1>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBell}
          className="icon-button"
          aria-label="Notificações"
        >
          <Icon name="bell" size={21} />
        </button>
        <button
          onClick={onLogout}
          className="rounded-xl border border-[#e4e3dc] bg-white px-3 text-[10px] font-extrabold text-[#59645f]"
        >
          Sair
        </button>
      </div>
    </header>
  )
}

function HomeScreen({
  tasks,
  properties,
  dashboard,
  onToggleTask,
  onProperty,
  onSeeOperation,
  onSeeProperties,
}: {
  tasks: Task[]
  properties: Property[]
  dashboard: Dashboard
  onToggleTask: (id: string) => void
  onProperty: (property: Property) => void
  onSeeOperation: () => void
  onSeeProperties: () => void
}) {
  const completed = tasks.filter((task) => task.done).length
  return (
    <>
      <section className="mx-5 overflow-hidden rounded-[28px] bg-[#173e37] p-5 text-white shadow-[0_18px_40px_rgba(20,58,51,.2)]">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold text-white/65">
              Visão geral ·{" "}
              {new Date().toLocaleDateString("pt-BR", { month: "long" })}
            </p>
            <h2 className="text-[28px] font-extrabold tracking-[-.05em]">
              Tudo sob controle
            </h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold">
            {dashboard.properties} imóveis
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/15">
          <Metric
            value={String(dashboard.pendingTasks)}
            label="Tarefas pendentes"
          />
          <Metric
            value={String(dashboard.completedTasks)}
            label="Tarefas concluídas"
          />
        </div>
      </section>

      <section className="px-5 pt-7">
        <SectionTitle
          title="Próximas ações"
          action="Ver operação"
          onAction={onSeeOperation}
        />
        <div className="mt-3 space-y-2.5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task.id)}
            />
          ))}
        </div>
        {completed > 0 && (
          <p className="mt-3 text-center text-xs font-semibold text-[#64706c]">
            {completed}{" "}
            {completed === 1 ? "tarefa concluída" : "tarefas concluídas"} hoje
          </p>
        )}
      </section>

      <section className="pt-8">
        <div className="px-5">
          <SectionTitle
            title="Seus imóveis"
            action="Ver todos"
            onAction={onSeeProperties}
          />
        </div>
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pb-3 pt-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => onProperty(property)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <p className="text-[18px] font-extrabold tracking-[-.03em]">{value}</p>
      <p className="mt-1 text-[10px] font-semibold text-white/55">{label}</p>
    </div>
  )
}

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[19px] font-extrabold tracking-[-.035em]">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-xs font-bold text-[#d7624c]"
        >
          {action}
          <Icon name="arrow" size={14} />
        </button>
      )}
    </div>
  )
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const tone: Record<string, string> = {
    orange: "bg-[#fdf0e6] text-[#dc704e]",
    green: "bg-[#e4f1e9] text-[#34705d]",
    purple: "bg-[#eee9f8] text-[#685b91]",
  }
  return (
    <button
      onClick={onToggle}
      className={`group flex w-full items-center gap-3.5 rounded-[20px] border bg-white p-3 text-left transition-all active:scale-[.98] ${
        task.done ? "border-[#d9e7df] opacity-60" : "border-[#ebe9e1]"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${tone[task.tone]}`}
      >
        <Icon name={task.done ? "check" : task.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-extrabold ${
            task.done ? "line-through" : ""
          }`}
        >
          {task.title}
        </p>
        <p className="mt-1 truncate text-[11px] font-semibold text-[#8a928f]">
          {task.place} · {task.time}
        </p>
      </div>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
          task.done
            ? "border-[#34705d] bg-[#34705d] text-white"
            : "border-[#d7d9d3] text-transparent"
        }`}
      >
        <Icon name="check" size={13} />
      </span>
    </button>
  )
}

function PropertyCard({
  property,
  onClick,
}: {
  property: Property
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-[285px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-[#e6e4db] bg-white text-left shadow-[0_8px_24px_rgba(25,39,35,.06)] active:scale-[.99]"
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={property.image}
          alt={`Interior de ${property.name}`}
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold text-[#193b35] backdrop-blur">
          {property.status}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-extrabold tracking-[-.02em]">{property.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#8b928f]">
          <Icon name="pin" size={12} />
          {property.location}
        </p>
        {property.owners.length > 0 && (
          <p className="mt-2 truncate text-[10px] font-bold text-[#63706b]">
            Administradores:{" "}
            {property.owners.map((owner) => owner.name).join(", ")}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-[#eeece5] pt-3">
          <span className="text-[11px] font-bold text-[#d7624c]">
            {property.next}
          </span>
          <Icon name="chevron" size={15} className="text-[#a2a8a5]" />
        </div>
      </div>
    </button>
  )
}

function PropertiesScreen({
  properties,
  dashboard,
  onSelect,
  onAdd,
}: {
  properties: Property[]
  dashboard: Dashboard
  onSelect: (property: Property) => void
  onAdd: () => void
}) {
  return (
    <section className="px-5">
      <div className="mb-6 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[#e2e1da] bg-white px-4 py-3 text-[#8e9692]">
          <Icon name="search" size={18} />
          <span className="text-sm font-semibold">Buscar imóvel</span>
        </div>
        <button className="icon-button" aria-label="Filtrar">
          <Icon name="filter" size={19} />
        </button>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <MiniStat
          value={String(dashboard.properties)}
          label="Imóveis cadastrados"
        />
        <MiniStat
          value={String(dashboard.pendingTasks)}
          label="Tarefas pendentes"
        />
      </div>
      <div className="space-y-4">
        {properties.map((property) => (
          <button
            key={property.id}
            onClick={() => onSelect(property)}
            className="w-full overflow-hidden rounded-[25px] border border-[#e5e3db] bg-white text-left shadow-[0_8px_25px_rgba(22,35,33,.05)]"
          >
            <div className="flex">
              <img
                src={property.image}
                alt=""
                className="h-[142px] w-[124px] object-cover"
              />
              <div className="min-w-0 flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold tracking-[-.02em]">
                    {property.name}
                  </h3>
                  <Icon name="more" size={17} className="text-[#89918e]" />
                </div>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#8a928f]">
                  <Icon name="pin" size={11} />
                  {property.location}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-[#e4f1e9] px-2.5 py-1 text-[9px] font-extrabold text-[#34705d]">
                    {property.status}
                  </span>
                </div>
                <p className="mt-3 text-[10px] font-bold text-[#d7624c]">
                  {property.next}
                </p>
              </div>
            </div>
          </button>
        ))}
        {!properties.length && (
          <p className="rounded-2xl bg-white p-4 text-xs font-semibold text-[#89918d]">
            Nenhum imóvel cadastrado ainda.
          </p>
        )}
      </div>
      <button onClick={onAdd} className="primary-button mt-6">
        <Icon name="plus" size={18} />
        Cadastrar imóvel
      </button>
    </section>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[20px] bg-[#e7f0eb] p-4">
      <p className="text-2xl font-extrabold tracking-[-.05em] text-[#234e45]">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-bold text-[#667a74]">{label}</p>
    </div>
  )
}

function OperationScreen({
  tasks,
  filter,
  setFilter,
  onToggleTask,
  onAdd,
}: {
  tasks: Task[]
  filter: string
  setFilter: (value: string) => void
  onToggleTask: (id: string) => void
  onAdd: () => void
}) {
  const visibleTasks =
    filter === "Checklists"
      ? tasks.filter((task) => task.category === "inspection")
      : tasks
  return (
    <section className="px-5">
      <div className="mb-6 flex rounded-2xl bg-[#ebeae4] p-1">
        {["Hoje", "Checklists"].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`flex-1 rounded-xl py-2.5 text-[11px] font-extrabold transition ${
              filter === item
                ? "bg-white text-[#173e37] shadow-sm"
                : "text-[#858d89]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-[#8d9591]">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h2 className="mt-1 text-xl font-extrabold">
              {filter === "Hoje"
                ? `${visibleTasks.filter((task) => !task.done).length} ações programadas`
                : "Checklists ativos"}
            </h2>
          </div>
          <button
            onClick={onAdd}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ed765f] text-white shadow-lg"
          >
            <Icon name="plus" />
          </button>
        </div>
        <div className="relative space-y-3 before:absolute before:bottom-10 before:left-[21px] before:top-10 before:w-px before:bg-[#dcded8]">
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task.id)}
            />
          ))}
          {!visibleTasks.length && (
            <p className="rounded-2xl border border-[#ebe9e1] bg-white p-4 text-xs font-semibold text-[#89918d]">
              Nenhuma ação para exibir.
            </p>
          )}
        </div>
        <div className="mt-7 rounded-[24px] bg-[#173e37] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Icon name="clipboard" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Fluxo automatizado</p>
                <p className="text-[10px] font-semibold text-white/55">
                  Da reserva à aprovação do serviço
                </p>
              </div>
            </div>
            <Icon name="chevron" size={18} />
          </div>
        </div>
      </>
    </section>
  )
}

function PeopleScreen({
  filter,
  setFilter,
  people,
  onAdd,
}: {
  filter: string
  setFilter: (value: string) => void
  people: Person[]
  onAdd: () => void
}) {
  const filtered = people.filter(
    (person) =>
      filter === "Todos" ||
      (filter === "Admins"
        ? person.kind === "administrator"
        : filter === "Prepostos"
          ? person.kind === "proxy"
          : person.kind === "provider"),
  )
  return (
    <section>
      <div className="px-5">
        <div className="mb-5 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[#e2e1da] bg-white px-4 py-3 text-[#8e9692]">
            <Icon name="search" size={18} />
            <span className="text-sm font-semibold">Buscar pessoa</span>
          </div>
          <button
            onClick={onAdd}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ed765f] text-white shadow-[0_8px_20px_rgba(237,118,95,.25)]"
            aria-label="Adicionar pessoa"
          >
            <Icon name="userPlus" size={19} />
          </button>
        </div>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-5">
        {["Todos", "Admins", "Prepostos", "Prestadores"].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-extrabold transition ${
              filter === item
                ? "bg-[#173e37] text-white"
                : "border border-[#dfded7] bg-white text-[#707a76]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mx-5 mb-5 rounded-[20px] bg-[#e7f0eb] p-4">
        <p className="text-[11px] font-bold leading-relaxed text-[#48645d]">
          Cadastros de administradores, prepostos e prestadores são independentes
          dos imóveis no schema atual.
        </p>
      </div>
      <div className="px-5">
        <h2 className="mb-3 text-sm font-extrabold">
          {filtered.length} pessoas
        </h2>
        <div className="overflow-hidden rounded-[24px] border border-[#e5e3dc] bg-white">
          {filtered.map((person, index) => (
            <PersonRow
              key={person.name}
              person={person}
              last={index === filtered.length - 1}
            />
          ))}
          {!filtered.length && (
            <p className="p-4 text-xs font-semibold text-[#89918d]">
              Nenhuma pessoa cadastrada nesta categoria.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function PersonRow({ person, last }: { person: Person; last: boolean }) {
  const colors: Record<string, string> = {
    coral: "bg-[#f9d8d0] text-[#b8523e]",
    navy: "bg-[#dce7e4] text-[#234e45]",
    green: "bg-[#dcefe5] text-[#34705d]",
    orange: "bg-[#f7e7d6] text-[#c16b38]",
    purple: "bg-[#e9e2f3] text-[#67578b]",
  }
  return (
    <button
      className={`flex w-full items-center gap-3 p-4 text-left ${
        last ? "" : "border-b border-[#eeece6]"
      }`}
    >
      <div className={`avatar ${colors[person.color]}`}>{person.initials}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{person.name}</p>
        <p className="mt-1 truncate text-[10px] font-semibold text-[#8a928f]">
          {person.role}
        </p>
        <p className="mt-1 text-[9px] font-bold text-[#d7624c]">
          {person.detail}
        </p>
      </div>
      <Icon name="chevron" size={16} className="text-[#a4aaa7]" />
    </button>
  )
}

function BottomNav({
  active,
  setActive,
}: {
  active: Tab
  setActive: (tab: Tab) => void
}) {
  const items: { id: Tab; icon: IconName; label: string }[] = [
    { id: "home", icon: "home", label: "Início" },
    { id: "properties", icon: "building", label: "Imóveis" },
    { id: "operation", icon: "check", label: "Operação" },
    { id: "people", icon: "users", label: "Pessoas" },
  ]
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[460px] -translate-x-1/2 items-center justify-around border-t border-[#deded8] bg-[#fbfaf7]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          className={`relative flex w-20 flex-col items-center gap-1 rounded-2xl py-2 text-[9px] font-extrabold transition ${
            active === item.id ? "text-[#173e37]" : "text-[#9aa09d]"
          }`}
        >
          {active === item.id && (
            <span className="absolute -top-2 h-[3px] w-6 rounded-full bg-[#ed765f]" />
          )}
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

function PropertyDetail({
  property,
  onClose,
  onManageEquipment,
  onEdit,
}: {
  property: Property
  onClose: () => void
  onManageEquipment: () => void
  onEdit: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-1/2 max-h-[92dvh] w-full max-w-[460px] -translate-x-1/2 overflow-y-auto rounded-t-[32px] bg-[#f8f7f2] animate-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56">
          <img
            src={property.image}
            alt=""
            className="h-full w-full rounded-t-[32px] object-cover"
          />
          <div className="absolute inset-0 rounded-t-[32px] bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#172321]"
          >
            <Icon name="close" size={19} />
          </button>
          <div className="absolute bottom-5 left-5 text-white">
            <span className="rounded-full bg-[#e8f4ec]/90 px-2.5 py-1 text-[9px] font-extrabold text-[#285a4c]">
              {property.status}
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">
              {property.name}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-white/75">
              <Icon name="pin" size={13} />
              {property.location}
            </p>
          </div>
        </div>
        <div className="p-5 pb-10">
          <button
            type="button"
            onClick={onManageEquipment}
            className="mb-4 flex w-full items-center justify-between rounded-2xl bg-[#e7f0eb] p-4 text-left"
          >
            <p className="text-sm font-extrabold text-[#234e45]">
              {property.equipmentCount}{" "}
              {property.equipmentCount === 1
                ? "equipamento cadastrado"
                : "equipamentos cadastrados"}
            </p>
            <span className="text-xs font-extrabold text-[#34705d] underline">
              Gerenciar
            </span>
          </button>
          <p className="rounded-2xl bg-white p-4 text-xs font-semibold leading-relaxed text-[#89918d]">
            Administradores:{" "}
            {property.owners.map((owner) => owner.name).join(", ") ||
              "Não informado"}
            . Tarefas e prestadores ainda não são vinculados a imóveis.
          </p>
          <button onClick={onEdit} className="primary-button mt-5">
            Editar dados do imóvel
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EquipmentPage({
  property,
  onBack,
}: {
  property: Property
  onBack: (equipmentCount: number) => void
}) {
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentRecord | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [observation, setObservation] = useState("")
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadEquipment() {
    setLoading(true)
    try {
      const result = await api<{ equipment: EquipmentRecord[] }>(
        `/properties/${encodeURIComponent(property.id)}/equipment`,
      )
      setEquipment(result.equipment)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar os equipamentos.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEquipment()
  }, [property.id])

  function startCreate() {
    setSelectedEquipment(null)
    setName("")
    setDescription("")
    setObservation("")
    setPhotoFiles([])
    setError("")
    setEditorOpen(true)
  }

  function startEdit(item: EquipmentRecord) {
    setSelectedEquipment(item)
    setName(item.name)
    setDescription(item.description)
    setObservation(item.observation)
    setPhotoFiles([])
    setError("")
    setEditorOpen(true)
  }

  function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || [])
    event.currentTarget.value = ""
    if (!files.length) return

    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError("As fotos devem ser JPEG, PNG ou WebP e ter até 5 MB cada.")
      return
    }

    const existingCount = selectedEquipment?.photos.length || 0
    if (existingCount + photoFiles.length + files.length > 10) {
      setError("Cada equipamento pode ter até 10 fotos.")
      return
    }

    setError("")
    setPhotoFiles((current) => [...current, ...files])
  }

  async function saveEquipment() {
    setError("")
    setSaving(true)
    try {
      const path = `/properties/${encodeURIComponent(property.id)}/equipment`
      let equipmentId = selectedEquipment?.id
      const values = {
        name,
        description,
        observation,
      }

      if (equipmentId) {
        await api(`${path}/${encodeURIComponent(equipmentId)}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
      } else {
        const created = await api<{ id: string }>(path, {
          method: "POST",
          body: JSON.stringify(values),
        })
        equipmentId = created.id
        const newEquipment = {
          id: equipmentId,
          ...values,
          photos: [],
        }
        setSelectedEquipment(newEquipment)
        setEquipment((current) => [newEquipment, ...current])
      }

      for (const file of photoFiles) {
        const imageDataUrl = await readImageDataUrl(file)
        const uploadedPhoto = await api<{ id: string }>(
          `${path}/${encodeURIComponent(equipmentId)}/photos`,
          {
            method: "POST",
            body: JSON.stringify({ imageDataUrl }),
          },
        )
        setSelectedEquipment((current) =>
          current
            ? {
                ...current,
                photos: [
                  ...current.photos,
                  {
                    id: uploadedPhoto.id,
                    url: `${path}/${encodeURIComponent(equipmentId)}/photos/${encodeURIComponent(uploadedPhoto.id)}`,
                  },
                ],
              }
            : current,
        )
        setPhotoFiles((current) => current.filter((item) => item !== file))
      }

      await loadEquipment()
      setEditorOpen(false)
      setSelectedEquipment(null)
      setPhotoFiles([])
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o equipamento.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteEquipment(item: EquipmentRecord) {
    if (!window.confirm(`Excluir o equipamento "${item.name}" e suas fotos?`)) {
      return
    }
    try {
      await api(
        `/properties/${encodeURIComponent(property.id)}/equipment/${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      )
      setEquipment((current) =>
        current.filter((equipmentItem) => equipmentItem.id !== item.id),
      )
      await loadEquipment()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o equipamento.",
      )
    }
  }

  async function deletePhoto(photo: EquipmentPhoto) {
    if (!selectedEquipment) return
    try {
      await api(
        `/properties/${encodeURIComponent(property.id)}/equipment/${encodeURIComponent(selectedEquipment.id)}/photos/${encodeURIComponent(photo.id)}`,
        { method: "DELETE" },
      )
      setSelectedEquipment((current) =>
        current
          ? {
              ...current,
              photos: current.photos.filter((item) => item.id !== photo.id),
            }
          : current,
      )
      setEquipment((current) =>
        current.map((item) =>
          item.id === selectedEquipment.id
            ? {
                ...item,
                photos: item.photos.filter((entry) => entry.id !== photo.id),
              }
            : item,
        ),
      )
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir a foto.",
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[#f8f7f2]">
      <div className="mx-auto flex h-full w-full max-w-[460px] flex-col">
        <header className="flex items-center gap-3 border-b border-[#e5e3dc] px-5 py-5">
          <button
            onClick={() => onBack(equipment.length)}
            className="icon-button"
            aria-label="Voltar"
          >
            <Icon name="arrow" size={19} className="rotate-180" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#89918d]">
              {property.name}
            </p>
            <h1 className="text-xl font-extrabold">Equipamentos</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-5 pb-10">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-2xl bg-[#fff1ec] p-3 text-xs font-bold text-[#a84734]"
            >
              {error}
            </p>
          )}

          {editorOpen ? (
            <section className="space-y-4 rounded-[24px] border border-[#e5e3dc] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">
                  {selectedEquipment ? "Alterar equipamento" : "Novo equipamento"}
                </h2>
                <button
                  onClick={() => {
                    setEditorOpen(false)
                    setError("")
                    void loadEquipment()
                  }}
                  className="icon-button"
                  aria-label="Fechar formulário"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              <Field
                label="Nome"
                value={name}
                onChange={setName}
                required
              />
              <label className="block">
                <span className="field-label">Descrição</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#34705d]"
                />
              </label>
              <label className="block">
                <span className="field-label">Observações</span>
                <textarea
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#34705d]"
                />
              </label>
              <label className="block">
                <span className="field-label">Fotos do equipamento</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={choosePhotos}
                  className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3 text-xs font-semibold text-[#59645f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e7f0eb] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#234e45]"
                />
                <span className="mt-1 block text-[10px] font-semibold text-[#8a928f]">
                  Até 10 fotos por equipamento · JPEG, PNG ou WebP · 5 MB cada
                </span>
              </label>
              {photoFiles.length > 0 && (
                <p className="text-xs font-semibold text-[#59645f]">
                  {photoFiles.length} nova(s) foto(s) selecionada(s)
                </p>
              )}
              {selectedEquipment && selectedEquipment.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedEquipment.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative overflow-hidden rounded-xl"
                    >
                      <img
                        src={photo.url}
                        alt="Foto do equipamento"
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void deletePhoto(photo)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white"
                        aria-label="Remover foto"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => void saveEquipment()}
                disabled={saving || name.trim().length < 2}
                className="primary-button disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar equipamento"}
                <Icon name="arrow" size={18} />
              </button>
            </section>
          ) : (
            <>
              <button onClick={startCreate} className="primary-button mb-5">
                <Icon name="plus" size={18} />
                Adicionar equipamento
              </button>
              {loading ? (
                <p className="text-center text-xs font-semibold text-[#89918d]">
                  Carregando equipamentos...
                </p>
              ) : equipment.length ? (
                <div className="space-y-3">
                  {equipment.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[22px] border border-[#e5e3dc] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-extrabold">{item.name}</h2>
                          {item.description && (
                            <p className="mt-1 text-xs text-[#66716d]">
                              {item.description}
                            </p>
                          )}
                          {item.observation && (
                            <p className="mt-1 text-[11px] text-[#89918d]">
                              {item.observation}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded-xl bg-[#e7f0eb] px-3 py-2 text-[10px] font-extrabold text-[#234e45]"
                          >
                            Alterar
                          </button>
                          <button
                            onClick={() => void deleteEquipment(item)}
                            className="rounded-xl bg-[#fff1ec] px-3 py-2 text-[10px] font-extrabold text-[#a84734]"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      {item.photos.length > 0 ? (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {item.photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.url}
                              alt={`Foto de ${item.name}`}
                              className="h-24 w-full rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-[10px] font-semibold text-[#89918d]">
                          Nenhuma foto cadastrada.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-white p-4 text-xs font-semibold text-[#89918d]">
                  Nenhum equipamento cadastrado neste imóvel.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function AddSheet({
  context,
  people,
  initialProperty,
  onManageEquipment,
  onClose,
  onSave,
}: {
  context: Tab
  people: Person[]
  initialProperty?: Property
  onManageEquipment: (property: Property) => void
  onClose: () => void
  onSave: (data: Record<string, unknown>, recordId?: string) => Promise<void>
}) {
  const title =
    context === "properties"
      ? initialProperty
        ? "Editar imóvel"
        : "Novo imóvel"
      : context === "operation"
        ? "Novo checklist"
        : "Nova pessoa"
  const [role, setRole] = useState("Preposto")
  const [values, setValues] = useState<Record<string, string>>(
    (): Record<string, string> =>
      initialProperty
        ? {
            name: initialProperty.name,
            address: initialProperty.address,
            postalCode: initialProperty.postalCode,
            city: initialProperty.city,
            state: initialProperty.state,
          }
        : {},
  )
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>(
    () => initialProperty?.owners.map((owner) => owner.id) || [],
  )
  const [imageDataUrl, setImageDataUrl] = useState("")
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const imagePreview =
    imageDataUrl ||
    (removeImage ? "" : initialProperty?.imageUrl || "")

  function setValue(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Selecione uma imagem JPEG, PNG ou WebP.")
      event.currentTarget.value = ""
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.")
      event.currentTarget.value = ""
      return
    }

    setError("")
    void readImageDataUrl(file)
      .then((dataUrl) => {
        setImageDataUrl(dataUrl)
        setRemoveImage(false)
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error ? reason.message : "Não foi possível ler a imagem.",
        )
      })
  }

  async function submit() {
    setError("")
    setSaving(true)
    try {
      if (context === "properties") {
        await onSave(
          {
            name: values.name,
            address: values.address,
            postalCode: values.postalCode || "",
            city: values.city || "",
            state: values.state || "",
            ownerIds: selectedOwnerIds,
            imageDataUrl: imageDataUrl || undefined,
            removeImage,
          },
          initialProperty?.id,
        )
      } else if (context === "operation") {
        await onSave({
          title: values.title,
          items: values.items
            ? values.items
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
        })
      } else {
        const kinds: Record<string, Person["kind"]> = {
          Admin: "administrator",
          Preposto: "proxy",
          Prestador: "provider",
        }
        await onSave({
          fullName: values.fullName,
          email: values.email || "",
          phone: values.phone || "",
          cpfCnpj: values.cpfCnpj || "",
          kind: kinds[role],
        })
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível salvar.",
      )
    } finally {
      setSaving(false)
    }
  }

  const availableOwners = people.filter(
    (person) =>
      person.kind === "administrator" &&
      person.id.startsWith("proprietario_adm:"),
  )

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-1/2 max-h-[91dvh] w-full max-w-[460px] -translate-x-1/2 overflow-y-auto rounded-t-[32px] bg-[#f8f7f2] p-5 pb-9 animate-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#d3d3cd]" />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#949b97]">
              Cadastro
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em]">
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="icon-button">
            <Icon name="close" size={18} />
          </button>
        </div>
        {context === "properties" ? (
          <div className="space-y-4">
            <Field
              label="Nome do imóvel"
              placeholder="Ex.: Casa Maré Alta"
              value={values.name || ""}
              onChange={(value) => setValue("name", value)}
              required
            />
            <Field
              label="Endereço"
              placeholder="Rua, número e cidade"
              value={values.address || ""}
              onChange={(value) => setValue("address", value)}
              required
            />
            <Field
              label="CEP"
              placeholder="00000-000"
              value={values.postalCode || ""}
              onChange={(value) => setValue("postalCode", value)}
            />
            <Field
              label="Cidade"
              value={values.city || ""}
              onChange={(value) => setValue("city", value)}
            />
            <Field
              label="Estado"
              placeholder="UF"
              value={values.state || ""}
              onChange={(value) => setValue("state", value)}
            />
            <label className="block">
              <span className="field-label">Imagem de capa</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseImage}
                className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3 text-xs font-semibold text-[#59645f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e7f0eb] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#234e45]"
              />
              <span className="mt-1 block text-[10px] font-semibold text-[#8a928f]">
                JPEG, PNG ou WebP · máximo 5 MB
              </span>
            </label>
            {imagePreview && (
              <div className="overflow-hidden rounded-2xl border border-[#dfded7] bg-white">
                <img
                  src={imagePreview}
                  alt="Pré-visualização da capa do imóvel"
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageDataUrl("")
                    setRemoveImage(Boolean(initialProperty?.imageUrl))
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-[#a84734]"
                >
                  Remover imagem de capa
                </button>
              </div>
            )}
            <div>
              <span className="field-label">Administradores</span>
              <div className="space-y-2 rounded-2xl border border-[#dfded7] bg-white p-3">
                {availableOwners.map((person) => {
                  const ownerId = person.id.slice("proprietario_adm:".length)
                  return (
                    <label
                      key={person.id}
                      className="flex items-center gap-2 text-xs font-semibold"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOwnerIds.includes(ownerId)}
                        onChange={() =>
                          setSelectedOwnerIds((current) =>
                            current.includes(ownerId)
                              ? current.filter((id) => id !== ownerId)
                              : [...current, ownerId],
                          )
                        }
                      />
                      {person.name}
                    </label>
                  )
                })}
                {!availableOwners.length && (
                  <p className="text-xs text-[#8a928f]">
                    Cadastre primeiro um administrador.
                  </p>
                )}
              </div>
              {availableOwners.length > 0 && selectedOwnerIds.length === 0 && (
                <p className="mt-2 text-[10px] font-semibold text-[#a84734]">
                  Selecione ao menos um administrador.
                </p>
              )}
            </div>
            {initialProperty && (
              <button
                type="button"
                onClick={() => onManageEquipment(initialProperty)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#dce4df] bg-white px-4 py-3.5 text-left text-sm font-extrabold text-[#234e45]"
              >
                Gerenciar equipamentos
                <Icon name="chevron" size={17} />
              </button>
            )}
          </div>
        ) : context === "operation" ? (
          <div className="space-y-4">
            <Field
              label="Nome do checklist"
              placeholder="Ex.: Checklist de check-in"
              value={values.title || ""}
              onChange={(value) => setValue("title", value)}
              required
            />
            <label className="block">
              <span className="field-label">
                Itens do checklist (um por linha)
              </span>
              <textarea
                value={values.items || ""}
                onChange={(event) => setValue("items", event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#34705d]"
                placeholder={"Conferir chaves\nVerificar limpeza"}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <Field
              label="Nome completo ou razão social"
              placeholder="Digite o nome"
              value={values.fullName || ""}
              onChange={(value) => setValue("fullName", value)}
              required
            />
            <Field
              label="E-mail"
              type="email"
              placeholder="pessoa@email.com"
              value={values.email || ""}
              onChange={(value) => setValue("email", value)}
            />
            <Field
              label="Telefone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={values.phone || ""}
              onChange={(value) => setValue("phone", value)}
            />
            <Field
              label="CPF/CNPJ"
              value={values.cpfCnpj || ""}
              onChange={(value) => setValue("cpfCnpj", value)}
            />
            <div>
              <label className="field-label">Papel no negócio</label>
              <div className="grid grid-cols-3 gap-2">
                {["Admin", "Preposto", "Prestador"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setRole(item)}
                    className={`rounded-xl border px-2 py-3 text-[10px] font-extrabold ${
                      role === item
                        ? "border-[#173e37] bg-[#173e37] text-white"
                        : "border-[#deded7] bg-white text-[#6f7975]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-[#fff1ec] p-3 text-xs font-bold text-[#a84734]"
          >
            {error}
          </p>
        )}
        <button
          onClick={() => void submit()}
          disabled={
            saving ||
            (context === "properties" && selectedOwnerIds.length === 0)
          }
          className="primary-button mt-7 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar cadastro"}
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder = "",
  type = "text",
  value,
  onChange,
  required = false,
}: {
  label: string
  placeholder?: string
  type?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[#dfded7] bg-white px-4 py-3.5 text-sm font-semibold outline-none transition placeholder:text-[#a8adaa] focus:border-[#34705d] focus:ring-2 focus:ring-[#34705d]/10"
        placeholder={placeholder}
      />
    </label>
  )
}
