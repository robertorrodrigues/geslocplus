const encodeField = (id: string, value: string) => {
  const length = new TextEncoder().encode(value).length
  if (length > 99) {
    throw new Error("Os dados informados excedem o limite do código Pix.")
  }
  return `${id}${length.toString().padStart(2, "0")}${value}`
}

const normalizePixLabel = (value: string, maxLength: number) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)

const calculateCrc16 = (value: string) => {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export function createPixPayload({
  key,
  amountInCents,
  receiverName,
  city,
}: {
  key: string
  amountInCents: number
  receiverName: string
  city: string
}) {
  const pixKey = key.trim()
  if (!pixKey) throw new Error("Cadastre uma chave Pix para este prestador.")
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new Error("Informe um valor válido para o pagamento.")
  }

  const merchantName = normalizePixLabel(receiverName, 25) || "PRESTADOR"
  const merchantCity = normalizePixLabel(city, 15)
  if (!merchantCity) throw new Error("Informe a cidade do recebedor.")

  const merchantAccount = [
    encodeField("00", "br.gov.bcb.pix"),
    encodeField("01", pixKey),
  ].join("")
  const additionalData = encodeField("05", "***")
  const payload = [
    encodeField("00", "01"),
    encodeField("01", "11"),
    encodeField("26", merchantAccount),
    encodeField("52", "0000"),
    encodeField("53", "986"),
    encodeField("54", (amountInCents / 100).toFixed(2)),
    encodeField("58", "BR"),
    encodeField("59", merchantName),
    encodeField("60", merchantCity),
    encodeField("62", additionalData),
    "6304",
  ].join("")

  return `${payload}${calculateCrc16(payload)}`
}
