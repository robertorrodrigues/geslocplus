export type AppUser = {
  id: string
  fullName: string
  email: string
  role: "administrator" | "platform_admin" | "provider"
  mustChangePassword: boolean
}

export class ApiError extends Error {
  constructor(
    message: string,

    public status: number,
  ) {
    super(message)
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,

    credentials: "same-origin",

    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),

      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)

    throw new ApiError(
      body?.error || "Não foi possível concluir a solicitação.",

      response.status,
    )
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const initials = (name: string) =>
  name

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0]?.toLocaleUpperCase("pt-BR") || "")

    .join("")

export const money = (value: number | string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",

    currency: "BRL",

    maximumFractionDigits: 0,
  }).format(Number(value || 0))
