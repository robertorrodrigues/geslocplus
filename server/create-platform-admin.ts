import "dotenv/config"

import bcrypt from "bcryptjs"

import { Pool } from "pg"

import { createInterface } from "node:readline/promises"

import { stdin, stdout } from "node:process"

import { z } from "zod"

if (!process.env.DATABASE_URL) {
  throw new Error("Configure DATABASE_URL antes de criar a conta.")
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const prompt = createInterface({ input: stdin, output: stdout })

function readHiddenPassword() {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw new Error(
      "Execute este comando em um terminal interativo para informar a senha com segurança.",
    )
  }

  stdout.write("Senha (mínimo 12 caracteres): ")

  stdin.setRawMode(true)

  stdin.resume()

  stdin.setEncoding("utf8")

  return new Promise<string>((resolve, reject) => {
    let password = ""

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          stdin.off("data", onData)

          stdin.setRawMode(false)

          stdin.pause()

          stdout.write("\n")

          reject(new Error("Operação cancelada."))

          return
        }

        if (character === "\r" || character === "\n") {
          stdin.off("data", onData)

          stdin.setRawMode(false)

          stdin.pause()

          stdout.write("\n")

          resolve(password)

          return
        }

        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1)
        } else {
          password += character
        }
      }
    }

    stdin.on("data", onData)
  })
}

try {
  const fullName = (
    await prompt.question("Nome do administrador da plataforma: ")
  )

    .trim()

  const email = (await prompt.question("E-mail de acesso: "))

    .trim()

    .toLowerCase()

  prompt.close()

  const password = await readHiddenPassword()

  const parsed = z

    .object({
      fullName: z.string().min(2).max(160),

      email: z.string().email().max(254),

      password: z.string().min(12).max(128),
    })

    .safeParse({ fullName, email, password })

  if (!parsed.success) {
    throw new Error(
      "Dados inválidos. Informe nome, e-mail válido e senha com pelo menos 12 caracteres.",
    )
  }

  const existing = await pool.query(
    "SELECT 1 FROM usuarios WHERE lower(email) = lower($1) LIMIT 1",

    [parsed.data.email],
  )

  if (existing.rowCount) {
    throw new Error("Já existe uma conta com este e-mail.")
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const result = await pool.query(
    `INSERT INTO usuarios (nome, email, password_hash, pessoa_id, tipo_pessoa)
     VALUES ($1, $2, $3, NULL, 'admin_plataforma')
     RETURNING id`,

    [parsed.data.fullName, parsed.data.email, passwordHash],
  )

  console.log(`Administrador da plataforma criado (ID: ${result.rows[0].id}).`)
} finally {
  prompt.close()

  await pool.end()
}
