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
  const personId = (
    await prompt.question("ID do administrador: ")
  ).trim()

  const email = (await prompt.question("E-mail de acesso: "))

    .trim()

    .toLowerCase()

  prompt.close()

  const password = await readHiddenPassword()

  const parsed = z

    .object({
      personId: z.string().regex(/^[1-9]\d*$/),

      email: z.string().email().max(254),

      password: z.string().min(12).max(128),
    })

    .safeParse({ personId, email, password })

  if (!parsed.success) {
    throw new Error(
      "Dados inválidos. Informe um ID válido, um e-mail e senha com pelo menos 12 caracteres.",
    )
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const person = await client.query(
      "SELECT nome FROM proprietarios_adm WHERE id = $1",

      [parsed.data.personId],
    )

    if (!person.rowCount) {
      throw new Error("Pessoa não encontrada na tabela correspondente.")
    }

    const existing = await client.query(
      "SELECT 1 FROM usuarios WHERE lower(email) = lower($1) LIMIT 1",

      [parsed.data.email],
    )

    if (existing.rowCount) {
      throw new Error("Já existe uma conta com este e-mail.")
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    await client.query(
      `INSERT INTO usuarios (nome, email, password_hash, pessoa_id, tipo_pessoa)
       VALUES ($1, $2, $3, $4, $5)`,

      [
        person.rows[0].nome,

        parsed.data.email,

        passwordHash,

        parsed.data.personId,

        "proprietario_adm",
      ],
    )

    await client.query("COMMIT")

    console.log("Conta de usuário criada.")
  } catch (error) {
    await client.query("ROLLBACK")

    throw error
  } finally {
    client.release()
  }
} finally {
  prompt.close()

  await pool.end()
}
