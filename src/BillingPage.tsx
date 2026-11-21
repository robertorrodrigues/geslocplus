import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { api } from "./api"
import { createPixPayload } from "./pix"
import { formatPrice, plans, type PlanId } from "./plans"

type PixConfig = {
  configured: boolean
  key: string | null
  name: string | null
  city: string | null
}

export default function BillingPage({
  propertyCount,
  isDataReady,
  onBack,
}: {
  propertyCount: number
  isDataReady: boolean
  onBack: () => void
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("mensal")
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [qrCode, setQrCode] = useState("")
  const [pixPayload, setPixPayload] = useState("")
  const [error, setError] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]
  const additionalPropertyCount = Math.max(0, propertyCount - 3)
  const totalPrice =
    selectedPlan.price +
    additionalPropertyCount * selectedPlan.additionalPropertyPrice

  useEffect(() => {
    let active = true
    api<PixConfig>("/billing/pix-config")
      .then((config) => {
        if (active) setPixConfig(config)
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a configuração do Pix.",
          )
        }
      })
      .finally(() => {
        if (active) setLoadingConfig(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function generatePayment() {
    setError("")
    setQrCode("")
    setPixPayload("")
    setCopied(false)

    if (
      !pixConfig?.configured ||
      !pixConfig.key ||
      !pixConfig.name ||
      !pixConfig.city
    ) {
      setError(
        "O Pix de recebimento ainda não foi configurado no ambiente do servidor.",
      )
      return
    }

    setIsGenerating(true)
    try {
      const payload = createPixPayload({
        key: pixConfig.key,
        amountInCents: Math.round(totalPrice * 100),
        receiverName: pixConfig.name,
        city: pixConfig.city,
      })
      const image = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 256,
      })
      setPixPayload(payload)
      setQrCode(image)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível gerar o QR Code Pix.",
      )
    } finally {
      setIsGenerating(false)
    }
  }

  async function copyPixPayload() {
    try {
      await navigator.clipboard.writeText(pixPayload)
      setCopied(true)
      setError("")
    } catch {
      setError("Não foi possível copiar. Selecione e copie o código Pix.")
    }
  }

  return (
    <section className="space-y-5 px-5 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-[#dfe2db] bg-white px-4 py-2 text-xs font-extrabold text-[#34705d]"
      >
        Voltar para início
      </button>

      <div>
        <h2 className="text-xl font-extrabold text-[#173e37]">
          Escolha seu plano
        </h2>
        <p className="mt-1 text-xs font-semibold text-[#64706a]">
          O pagamento é feito por Pix.
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            aria-pressed={selectedPlanId === plan.id}
            disabled={isGenerating}
            onClick={() => {
              setSelectedPlanId(plan.id)
              setQrCode("")
              setPixPayload("")
              setCopied(false)
              setError("")
            }}
            className={`w-full rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
              selectedPlanId === plan.id
                ? "border-[#173e37] bg-[#e7f0eb]"
                : "border-[#e5e3dc] bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-[#20352f]">
                  {plan.name}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[#7b8781]">
                  {plan.cadence}
                </p>
              </div>
              <p className="text-lg font-extrabold text-[#173e37]">
                {formatPrice(plan.price)}
              </p>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#64706a]">
              {plan.description}
            </p>
            <p className="mt-2 text-[10px] font-semibold text-[#64706a]">
              Até 3 imóveis incluídos. Imóvel adicional:{" "}
              {formatPrice(plan.additionalPropertyPrice)}{" "}
              {plan.additionalPropertyCadence}.
            </p>
          </button>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-[#64706a]">
        {propertyCount} {propertyCount === 1 ? "imóvel" : "imóveis"} no cálculo
        {additionalPropertyCount > 0
          ? `, incluindo ${additionalPropertyCount} ${
              additionalPropertyCount === 1 ? "adicional" : "adicionais"
            }`
          : ""}.
      </p>

      {!isDataReady && (
        <p className="text-xs font-semibold text-[#64706a]">
          Aguarde o carregamento dos dados para calcular o valor correto.
        </p>
      )}
      {loadingConfig && (
        <p className="text-xs font-semibold text-[#64706a]">
          Carregando configuração do Pix...
        </p>
      )}
      {!loadingConfig && pixConfig && !pixConfig.configured && (
        <p
          role="alert"
          className="rounded-2xl border border-[#f1c8bd] bg-[#fff1ec] p-3 text-xs font-bold text-[#a84734]"
        >
          Configure PIX_RECEIVER_KEY, PIX_RECEIVER_NAME e PIX_RECEIVER_CITY no
          ambiente do servidor para receber pagamentos.
        </p>
      )}

      <button
        type="button"
        onClick={() => void generatePayment()}
        disabled={
          loadingConfig ||
          isGenerating ||
          !pixConfig?.configured ||
          !isDataReady
        }
        className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating
          ? "Gerando Pix..."
          : `Gerar Pix de ${formatPrice(totalPrice)}`}
      </button>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#fff1ec] p-3 text-xs font-bold text-[#a84734]"
        >
          {error}
        </p>
      )}

      {qrCode && (
        <div className="rounded-2xl border border-[#e5e3dc] bg-white p-4 text-center">
          <p className="text-sm font-extrabold text-[#173e37]">
            {selectedPlan.name} · {formatPrice(totalPrice)}
          </p>
          <img
            src={qrCode}
            alt={`QR Code Pix de ${formatPrice(totalPrice)} para ${pixConfig?.name}`}
            className="mx-auto mt-3 h-64 w-64 max-w-full"
          />
          <p className="mt-2 text-xs font-bold text-[#64706a]">
            Escaneie o QR Code no app do seu banco
          </p>
          <label className="mt-4 block text-left">
            <span className="field-label">Pix copia e cola</span>
            <textarea
              readOnly
              value={pixPayload}
              rows={4}
              className="w-full resize-none rounded-xl border border-[#dfe2db] bg-[#f8f7f2] p-3 text-[10px] font-semibold text-[#35423f]"
            />
          </label>
          <button
            type="button"
            onClick={() => void copyPixPayload()}
            className="mt-3 w-full rounded-xl bg-[#e7f0eb] px-4 py-3 text-xs font-extrabold text-[#34705d]"
          >
            {copied ? "Código copiado" : "Copiar Pix copia e cola"}
          </button>
          <p className="mt-4 rounded-xl bg-[#f7f5ee] p-3 text-left text-[10px] font-semibold leading-relaxed text-[#64706a]">
            O pagamento não é confirmado automaticamente pelo app. A liberação
            do plano depende de confirmação manual do recebimento.
          </p>
        </div>
      )}
    </section>
  )
}
