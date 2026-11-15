import "dotenv/config"

import bcrypt from "bcryptjs"

import { Pool } from "pg"

import { createInterface } from "node:readline/promises"

import { stdin, stdout } from "node:process"

import { z } from "zod"

if (!process.env.DATABASE_URL) {
  throw new Error("Configure DATABASE_URL antes de redefinir a senha.")
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const prompt = createInterface({ input: stdin, output: stdout })

function readHiddenPassword() {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw new Error(
      "Execute este comando em um terminal interativo para informar a senha com segurança.",
    )
  }

  stdout.write("Nova senha (mínimo 12 caracteres): ")

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
  const email = (await prompt.question("E-mail da conta: "))

    .trim()

    .toLowerCase()

  prompt.close()

  const password = await readHiddenPassword()

  const parsed = z

    .object({
      email: z.string().email().max(254),

      password: z.string().min(12).max(128),
    })

    .safeParse({ email, password })

  if (!parsed.success) {
    throw new Error(
      "Dados inválidos. Informe um e-mail válido e uma senha com pelo menos 12 caracteres.",
    )
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const account = await client.query<{
      id: string

      tipo_pessoa: string | null

      pessoa_id: string

      proprietor_id: string | null
    }>(
      `SELECT u.id, u.tipo_pessoa, u.pessoa_id, p.id AS proprietor_id
       FROM usuarios u
       LEFT JOIN proprietarios_adm p
         ON p.id = u.pessoa_id AND u.tipo_pessoa = 'proprietario_adm'
       WHERE lower(u.email) = lower($1)
       ORDER BY u.id
       LIMIT 2`,

      [parsed.data.email],
    )

    if (account.rowCount !== 1) {
      throw new Error(
        account.rowCount
          ? "Há mais de uma conta com este e-mail; corrija a duplicidade antes de redefinir a senha."
          : "Não foi encontrada uma conta com este e-mail.",
      )
    }

    const user = account.rows[0]

    if (
      user.tipo_pessoa !== "proprietario_adm" ||
      !user.proprietor_id ||
      user.pessoa_id !== user.proprietor_id
    ) {
      throw new Error(
        "Esta conta não está vinculada a um administrador e não pode acessar o sistema.",
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    await client.query(
      "UPDATE usuarios SET password_hash = $1, dt_alteracao = now() WHERE id = $2",

      [passwordHash, user.id],
    )

    await client.query("COMMIT")

    console.log("Senha redefinida. Entre usando o e-mail e a nova senha.")
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
