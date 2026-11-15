import "dotenv/config"

import { readFile } from "node:fs/promises"

import { fileURLToPath } from "node:url"

import path from "node:path"

import { Pool } from "pg"

if (!process.env.DATABASE_URL) {
  throw new Error("Configure DATABASE_URL antes de executar o schema.")
}

const schemaPath = fileURLToPath(
  new URL("../database/schema.sql", import.meta.url),
)

const sql = await readFile(path.resolve(schemaPath), "utf8")

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  await pool.query(sql)

  console.log("Tabelas criadas/atualizadas com sucesso.")
} finally {
  await pool.end()
}
