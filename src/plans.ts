export type PlanId = "mensal" | "semestral" | "anual"

export type Plan = {
  id: PlanId
  name: string
  price: number
  cadence: string
  description: string
  additionalPropertyPrice: number
  additionalPropertyCadence: string
  featured?: boolean
}

export const plans: Plan[] = [
  {
    id: "mensal",
    name: "Mensal",
    price: 20,
    cadence: "por mês",
    description: "Flexibilidade para começar",
    additionalPropertyPrice: 10,
    additionalPropertyCadence: "por mês por imóvel adicional",
  },
  {
    id: "semestral",
    name: "Semestral",
    price: 90,
    cadence: "a cada 6 meses",
    description: "Economize R$ 30 no período",
    additionalPropertyPrice: 45,
    additionalPropertyCadence:
      "por imóvel adicional a cada 6 meses (25% de desconto)",
    featured: true,
  },
  {
    id: "anual",
    name: "Anual",
    price: 144,
    cadence: "por ano",
    description: "Economize R$ 96 no ano",
    additionalPropertyPrice: 72,
    additionalPropertyCadence: "por imóvel adicional por ano (40% de desconto)",
  },
]

export const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(price)
