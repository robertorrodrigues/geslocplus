import "dotenv/config"

import cookieParser from "cookie-parser"

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"

import rateLimit from "express-rate-limit"

import bcrypt from "bcryptjs"

import jwt, { type JwtPayload } from "jsonwebtoken"

import { Pool, type PoolClient } from "pg"

import { z } from "zod"

const port = Number(process.env.API_PORT || 3001)

const jwtSecret = process.env.JWT_SECRET

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não foi configurada.")
}

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET precisa ter pelo menos 32 caracteres.")
}

if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) {
  throw new Error("APP_ORIGIN precisa ser configurada em produção.")
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  connectionTimeoutMillis: 5000,
})

async function getUserPersonId(userId: string, executor: Pool | PoolClient = pool) {
  const result = await executor.query(
    `SELECT pessoa_id::text AS id FROM usuarios
     WHERE id = $1 AND tipo_pessoa = 'proprietario_adm'`,
    [userId],
  )
  if (!result.rowCount) {
    throw new ApiError(403, "Usuário sem vínculo com administrador.")
  }
  return String(result.rows[0].id)
}

async function requirePropertyAccess(
  userId: string,
  propertyId: string,
  executor: Pool | PoolClient = pool,
) {
  const result = await executor.query(
    `SELECT 1
     FROM proprietarios_adm_imoveis pai
     JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
     WHERE u.id = $1 AND u.tipo_pessoa = 'proprietario_adm'
       AND pai.imoveis_id = $2`,
    [userId, propertyId],
  )
  if (!result.rowCount) throw new ApiError(404, "Imóvel não encontrado.")
}

const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  observation: z.string().trim().max(2000).optional(),
})

const equipmentPhotoSchema = z.object({
  imageDataUrl: z.string().max(7_000_000),
})

const app = express()

const cookieName = "geslocplus_session"

const sessionDurationMs = 12 * 60 * 60 * 1000

type AuthClaims = {
  userId: string

  fullName: string

  personType: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthClaims
    }
  }
}

class ApiError extends Error {
  constructor(
    public status: number,

    message: string,
  ) {
    super(message)
  }
}

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next)
  }

const readClaims = (token: string): AuthClaims => {
  const payload = jwt.verify(token, jwtSecret!) as JwtPayload & AuthClaims

  if (!payload.userId || !payload.fullName || !payload.personType) {
    throw new Error("Token de sessão inválido.")
  }

  return {
    userId: payload.userId,
    fullName: payload.fullName,
    personType: payload.personType,
  }
}

const clearSessionCookie = (res: Response) => {
  res.clearCookie(cookieName, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    path: "/",
  })
}

const authRequired = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[cookieName]

  if (!token) return next(new ApiError(401, "Faça login para continuar."))

  try {
    req.user = readClaims(token)

    next()
  } catch {
    next(new ApiError(401, "Sua sessão expirou. Entre novamente."))
  }
}

const authOptional = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[cookieName]

  if (!token) return next()

  try {
    req.user = readClaims(token)

    next()
  } catch {
    clearSessionCookie(res)

    next()
  }
}

const proprietarioAdminRequired = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.user?.personType !== "proprietario_adm") {
    return next(
      new ApiError(
        403,
        "Acesso restrito a usuários administradores.",
      ),
    )
  }
  next()
}

const platformAdminRequired = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.user?.personType !== "admin_plataforma") {
    return next(
      new ApiError(403, "Acesso restrito ao administrador da plataforma."),
    )
  }
  next()
}

const positiveId = z.string().regex(/^[1-9]\d*$/, "Identificador inválido.")
const maxImageBytes = 5 * 1024 * 1024
const maxEquipmentPhotos = 10

const emailSchema = z.string().trim().email().max(254)

const loginSchema = z.object({
  email: emailSchema,

  password: z.string().min(1).max(128),
})

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: z.string().min(12).max(128),
  plan: z.enum(["mensal", "semestral", "anual"]).default("mensal"),
})

const platformAdministratorSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: emailSchema.or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  cpfCnpj: z.string().trim().max(30).optional(),
})

const propertySchema = z.object({
  name: z.string().trim().min(2).max(160),

  address: z.string().trim().min(2).max(250),

  city: z.string().trim().max(120).optional(),

  state: z.string().trim().length(2).optional(),

  postalCode: z.string().trim().max(20).optional(),

  ownerIds: z
    .array(positiveId)
    .min(1, "Selecione ao menos um administrador.")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Não repita administradores.",
    }),

  imageDataUrl: z.string().max(7_000_000).optional(),

  removeImage: z.boolean().default(false),
})

function parseImageDataUrl(value: string | undefined) {
  if (!value) return null

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value,
  )
  if (!match) {
    throw new ApiError(400, "Use uma imagem JPEG, PNG ou WebP válida.")
  }

  const mimeType = match[1]
  const data = Buffer.from(match[2], "base64")
  const validSignature =
    (mimeType === "image/jpeg" &&
      data.length >= 3 &&
      data[0] === 0xff &&
      data[1] === 0xd8 &&
      data[2] === 0xff) ||
    (mimeType === "image/png" &&
      data.length >= 8 &&
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === "image/webp" &&
      data.length >= 12 &&
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP")

  if (
    !data.length ||
    data.length > maxImageBytes ||
    data.toString("base64") !== match[2] ||
    !validSignature
  ) {
    throw new ApiError(
      400,
      "A imagem deve ser JPEG, PNG ou WebP e ter no máximo 5 MB.",
    )
  }

  return { data, mimeType }
}

const personSchema = z.object({
  fullName: z.string().trim().min(2).max(160),

  kind: z.enum(["administrator", "proxy", "provider"]),

  email: emailSchema.optional().or(z.literal("")),

  phone: z.string().trim().max(40).optional(),

  cpfCnpj: z.string().trim().max(30).optional(),

  pixCode: z.string().trim().max(200).optional(),
})

const personUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: emailSchema.optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  cpfCnpj: z.string().trim().max(30).optional(),
  pixCode: z.string().trim().max(200).optional(),
})

const operationTaskSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    observation: z.string().trim().max(2000).default(""),
    propertyId: positiveId,
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
    executorType: z.enum(["administrator", "provider"]),
    executorId: positiveId,
    checklistIds: z
      .array(positiveId)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Não repita checklists.",
      })
      .default([]),
  })
  .superRefine((task, context) => {
    if (
      task.startAt &&
      task.endAt &&
      new Date(task.startAt).getTime() > new Date(task.endAt).getTime()
    ) {
      context.addIssue({
        code: "custom",
        message: "A data de início deve ser anterior à data de fim.",
        path: ["endAt"],
      })
    }
  })

const operationTaskStatusSchema = z.object({
  status: z.enum([
    "iniciar",
    "em_andamento",
    "final_ok",
    "final_prb",
    "cancelada",
  ]),
})

async function requireTaskExecutor(
  userId: string,
  executorType: "administrator" | "provider",
  executorId: string,
  client: PoolClient,
  allowArchived = false,
) {
  const result =
    executorType === "administrator"
      ? await client.query(
          `SELECT id FROM proprietarios_adm
           WHERE id = $1 AND created_by_user_id = $2
             AND ($3::boolean OR archived_at IS NULL)`,
          [executorId, userId, allowArchived],
        )
      : await client.query(
          `SELECT id FROM prestadores_servico
           WHERE id = $1 AND created_by_user_id = $2
             AND ($3::boolean OR archived_at IS NULL)`,
          [executorId, userId, allowArchived],
        )

  if (!result.rowCount) {
    throw new ApiError(400, "O executor selecionado não foi encontrado.")
  }
}

async function requireTaskChecklists(
  userId: string,
  checklistIds: string[],
  client: PoolClient,
) {
  if (!checklistIds.length) return

  const result = await client.query(
    `SELECT id FROM checklists
     WHERE id = ANY($1::bigint[])
       AND (tipo = 'padrao'
         OR (tipo = 'personalizado' AND created_by_user_id = $2))
     FOR SHARE`,
    [checklistIds, userId],
  )

  if (result.rowCount !== checklistIds.length) {
    throw new ApiError(
      400,
      "Um ou mais checklists selecionados não estão disponíveis.",
    )
  }
}

async function syncTaskChecklists(
  taskId: string,
  userId: string,
  checklistIds: string[],
  client: PoolClient,
) {
  const existing = await client.query(
    `SELECT checklist_origem_id::text AS source_id
     FROM tarefas_operacao_checklists
     WHERE tarefa_id = $1`,
    [taskId],
  )
  const existingIds = new Set(
    existing.rows.map((row: { source_id: string }) => row.source_id),
  )
  const newIds = checklistIds.filter((id) => !existingIds.has(id))
  await requireTaskChecklists(userId, newIds, client)

  if (checklistIds.length) {
    await client.query(
      `DELETE FROM tarefas_operacao_checklists
       WHERE tarefa_id = $1
         AND checklist_origem_id <> ALL($2::bigint[])`,
      [taskId, checklistIds],
    )
  } else {
    await client.query(
      "DELETE FROM tarefas_operacao_checklists WHERE tarefa_id = $1",
      [taskId],
    )
  }

  for (const [position, sourceId] of checklistIds.entries()) {
    if (existingIds.has(sourceId)) {
      await client.query(
        `UPDATE tarefas_operacao_checklists
         SET posicao = $3
         WHERE tarefa_id = $1 AND checklist_origem_id = $2`,
        [taskId, sourceId, position],
      )
      continue
    }

    const copy = await client.query(
      `INSERT INTO tarefas_operacao_checklists
         (tarefa_id, checklist_origem_id, titulo, posicao)
       SELECT $1, c.id, c.titulo, $3
       FROM checklists c
       WHERE c.id = $2
       RETURNING id`,
      [taskId, sourceId, position],
    )
    if (!copy.rowCount) {
      throw new ApiError(400, "Um checklist selecionado não foi encontrado.")
    }

    await client.query(
      `INSERT INTO tarefas_operacao_checklist_items
         (tarefa_checklist_id, titulo, descricao, regra, posicao)
       SELECT $1, titulo, descricao, regra, posicao
       FROM checklist_items
       WHERE checklist_id = $2
       ORDER BY posicao, id`,
      [copy.rows[0].id, sourceId],
    )
  }
}

const checklistSchema = z.object({
  title: z.string().trim().min(2).max(160),

  items: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
})

const platformChecklistSchema = z.object({
  title: z.string().trim().min(2).max(160),
  items: z.array(z.string().trim().min(1).max(160)).min(1).max(50),
})

app.use(express.json({ limit: "7mb" }))

app.use(cookieParser())

app.use((req, _res, next) => {
  const origin = req.headers.origin

  const allowedOrigin = process.env.APP_ORIGIN

  if (origin && allowedOrigin && origin !== allowedOrigin) {
    return next(new ApiError(403, "Origem não autorizada."))
  }

  next()
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
})

app.get(
  "/api/health",

  asyncRoute(async (_req, res) => {
    await pool.query("SELECT 1")

    res.json({ status: "ok", database: "connected" })
  }),
)

app.post(
  "/api/auth/login",

  loginLimiter,

  asyncRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)

    if (!parsed.success) {
      throw new ApiError(400, "Informe e-mail e senha válidos.")
    }

    const result = await pool.query(
      `SELECT id, nome, email, password_hash, tipo_pessoa
       FROM usuarios WHERE lower(email) = lower($1) LIMIT 1`,

      [parsed.data.email],
    )

    const user = result.rows[0]

    if (
      !user ||
      !(await bcrypt.compare(parsed.data.password, user.password_hash))
    ) {
      throw new ApiError(401, "E-mail ou senha incorretos.")
    }

    if (
      user.tipo_pessoa !== "proprietario_adm" &&
      user.tipo_pessoa !== "admin_plataforma"
    ) {
      throw new ApiError(
        403,
        "O acesso ao sistema é restrito a administradores.",
      )
    }

    const token = jwt.sign(
      {
        userId: String(user.id),
        fullName: user.nome,
        personType: user.tipo_pessoa,
      },

      jwtSecret!,

      { expiresIn: "12h" },
    )

    res.cookie(cookieName, token, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: "lax",

      path: "/",

      maxAge: sessionDurationMs,
    })

    res.json({
      user: {
        id: String(user.id),
        fullName: user.nome,
        email: user.email,
        role:
          user.tipo_pessoa === "admin_plataforma"
            ? "platform_admin"
            : "administrator",
      },
    })
  }),
)

app.post(
  "/api/auth/signup",
  loginLimiter,
  asyncRoute(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body)

    if (!parsed.success) {
      throw new ApiError(400, "Informe um nome, e-mail e senha válidos.")
    }

    const { fullName, email, password, plan } = parsed.data

    const existingUser = await pool.query(
      `SELECT 1 FROM usuarios WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    )

    if (existingUser.rowCount) {
      throw new ApiError(409, "Já existe uma conta com este e-mail.")
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      const personResult = await client.query(
        `INSERT INTO proprietarios_adm (nome, email, telefone)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [fullName, email, null],
      )

      const passwordHash = await bcrypt.hash(password, 12)

      const userResult = await client.query(
        `INSERT INTO usuarios (nome, email, password_hash, pessoa_id, tipo_pessoa)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email`,
        [fullName, email, passwordHash, personResult.rows[0].id, "proprietario_adm"],
      )

      const user = userResult.rows[0]
      await client.query(
        `UPDATE proprietarios_adm
         SET created_by_user_id = $1
         WHERE id = $2`,
        [user.id, personResult.rows[0].id],
      )

      const token = jwt.sign(
        {
          userId: String(user.id),
          fullName: user.nome,
          personType: "proprietario_adm",
        },
        jwtSecret!,
        { expiresIn: "12h" },
      )

      res.cookie(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: sessionDurationMs,
      })

      await client.query("COMMIT")

      res.status(201).json({
        user: {
          id: String(user.id),
          fullName: user.nome,
          email: user.email,
          role: "administrator",
        },
        plan,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res)

  res.status(204).end()
})

app.get(
  "/api/auth/me",

  authOptional,

  asyncRoute(async (req, res) => {
    if (!req.user) {
      res.json({ user: null })

      return
    }

    const result = await pool.query(
      "SELECT id, nome, email, tipo_pessoa FROM usuarios WHERE id = $1",

      [req.user.userId],
    )

    if (!result.rowCount) {
      clearSessionCookie(res)

      res.json({ user: null })

      return
    }

    res.json({
      user: {
        id: String(result.rows[0].id),

        fullName: result.rows[0].nome,

        email: result.rows[0].email,

        role:
          result.rows[0].tipo_pessoa === "admin_plataforma"
            ? "platform_admin"
            : "administrator",
      },
    })
  }),
)

app.get(
  "/api/platform/administrators",
  authRequired,
  platformAdminRequired,
  asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `SELECT pa.id::text AS id, pa.nome AS full_name,
              coalesce(account.email, pa.email) AS email,
              pa.telefone AS phone, pa.cpf_cnpj AS cpf_cnpj,
              (account.id IS NOT NULL) AS has_account
       FROM proprietarios_adm pa
       LEFT JOIN LATERAL (
         SELECT u.id, u.email
         FROM usuarios u
         WHERE u.pessoa_id = pa.id AND u.tipo_pessoa = 'proprietario_adm'
         ORDER BY u.id
         LIMIT 1
       ) account ON TRUE
       ORDER BY pa.nome, pa.id`,
    )
    res.json({ administrators: result.rows })
  }),
)

app.patch(
  "/api/platform/administrators/:id",
  authRequired,
  platformAdminRequired,
  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const parsed = platformAdministratorSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, "Confira os dados do administrador.")
    }

    const fullName = parsed.data.fullName
    const email = parsed.data.email.trim().toLowerCase() || null
    const phone = parsed.data.phone?.trim() || null
    const cpfCnpj = parsed.data.cpfCnpj?.trim() || null

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const administrator = await client.query(
        "SELECT id FROM proprietarios_adm WHERE id = $1 FOR UPDATE",
        [id.data],
      )
      if (!administrator.rowCount) {
        throw new ApiError(404, "Administrador não encontrado.")
      }

      const account = await client.query(
        `SELECT id FROM usuarios
         WHERE pessoa_id = $1 AND tipo_pessoa = 'proprietario_adm'
         ORDER BY id LIMIT 1 FOR UPDATE`,
        [id.data],
      )

      if (account.rowCount && !email) {
        throw new ApiError(
          400,
          "Informe um e-mail para manter o acesso deste administrador.",
        )
      }

      if (account.rowCount && email) {
        const duplicate = await client.query(
          `SELECT 1 FROM usuarios
           WHERE lower(email) = lower($1) AND id <> $2
           LIMIT 1`,
          [email, account.rows[0].id],
        )
        if (duplicate.rowCount) {
          throw new ApiError(409, "Já existe uma conta com este e-mail.")
        }
      }

      const updated = await client.query(
        `UPDATE proprietarios_adm
         SET nome = $2, email = $3, telefone = $4, cpf_cnpj = $5
         WHERE id = $1
         RETURNING id::text AS id, nome AS full_name, email, telefone AS phone,
                   cpf_cnpj, TRUE AS has_account`,
        [id.data, fullName, email, phone, cpfCnpj],
      )

      if (account.rowCount) {
        await client.query(
          `UPDATE usuarios
           SET nome = $1, email = $2, dt_alteracao = now()
           WHERE id = $3`,
          [fullName, email, account.rows[0].id],
        )
      }

      await client.query("COMMIT")
      res.json({
        administrator: {
          ...updated.rows[0],
          has_account: Boolean(account.rowCount),
        },
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.get(
  "/api/platform/checklists",
  authRequired,
  platformAdminRequired,
  asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `SELECT c.id::text AS id, c.titulo AS title, c.status,
              c.descricao AS description, c.tipo AS type,
              coalesce((
                SELECT json_agg(json_build_object(
                  'id', ci.id::text, 'title', ci.titulo,
                  'description', ci.descricao, 'rule', ci.regra
                ) ORDER BY ci.posicao, ci.id)
                FROM checklist_items ci WHERE ci.checklist_id = c.id
              ), '[]'::json) AS items
       FROM checklists c
       WHERE c.tipo = 'padrao'
       ORDER BY c.id DESC`,
    )
    res.json({ checklists: result.rows })
  }),
)

app.post(
  "/api/platform/checklists",
  authRequired,
  platformAdminRequired,
  asyncRoute(async (req, res) => {
    const parsed = platformChecklistSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, "Informe o nome e ao menos um item do checklist.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const checklist = await client.query(
        `INSERT INTO checklists (titulo, status, tipo)
         VALUES ($1, 'ativo', 'padrao')
         RETURNING id`,
        [parsed.data.title],
      )

      for (const [position, title] of parsed.data.items.entries()) {
        await client.query(
          `INSERT INTO checklist_items (checklist_id, titulo, posicao)
           VALUES ($1, $2, $3)`,
          [checklist.rows[0].id, title, position],
        )
      }

      await client.query("COMMIT")
      res.status(201).json({ id: String(checklist.rows[0].id) })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.use("/api", authRequired, proprietarioAdminRequired)

app.get(
  "/api/dashboard",

  asyncRoute(async (req, res) => {
    const [properties, tasks] = await Promise.all([
      pool.query(
        `SELECT count(*)::int AS total FROM imoveis im
         WHERE EXISTS (
           SELECT 1 FROM proprietarios_adm_imoveis pai
           JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
           WHERE pai.imoveis_id = im.id AND u.id = $1
             AND u.tipo_pessoa = 'proprietario_adm'
         )`,
        [req.user!.userId],
      ),

      pool.query(
        `SELECT count(*) FILTER (
                  WHERE status NOT IN ('final_ok', 'final_prb', 'cancelada')
                )::int AS pending,
                count(*) FILTER (
                  WHERE status IN ('final_ok', 'final_prb')
                )::int AS completed
         FROM tarefas_operacao t
         WHERE t.created_by_user_id = $1
           AND EXISTS (
             SELECT 1 FROM proprietarios_adm_imoveis pai
             JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
             WHERE pai.imoveis_id = t.imovel_id AND u.id = $1
               AND u.tipo_pessoa = 'proprietario_adm'
           )`,
        [req.user!.userId],
      ),
    ])

    res.json({
      properties: properties.rows[0].total,

      pendingTasks: tasks.rows[0].pending,

      completedTasks: tasks.rows[0].completed,

      monthlyRevenue: 0,

      averageRating: 0,

      occupancyPercent: 0,
    })
  }),
)

app.get(
  "/api/properties",

  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT im.id::text AS id, im.nome AS name, im.endereco AS address,
              im.cep AS postal_code, im.cidade AS city,
              im.estado AS state,
              CASE WHEN im.image_data IS NOT NULL AND im.image_mime_type IS NOT NULL
                   THEN '/api/properties/' || im.id::text || '/image'
                   ELSE NULL END AS image_url,
              'active'::text AS status,
              coalesce((
                SELECT json_agg(json_build_object('id', pa.id::text, 'name', pa.nome)
                                ORDER BY pa.nome)
                FROM proprietarios_adm_imoveis pai
                JOIN proprietarios_adm pa ON pa.id = pai.proprietarios_adm_id
                WHERE pai.imoveis_id = im.id
                  AND pa.created_by_user_id = $1
              ), '[]'::json) AS owners,
              (SELECT count(*)::int FROM equipamentos e
               WHERE e.imovel_id = im.id) AS equipment_count,
              NULL::text AS manager, ''::text AS providers,
              0::numeric AS income, 0::int AS occupied_today
       FROM imoveis im
       WHERE EXISTS (
         SELECT 1 FROM proprietarios_adm_imoveis pai
         JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
         WHERE pai.imoveis_id = im.id AND u.id = $1
           AND u.tipo_pessoa = 'proprietario_adm'
       )
       ORDER BY im.id DESC`,
      [req.user!.userId],
    )

    res.json({ properties: result.rows })
  }),
)

app.get(
  "/api/properties/:id/image",

  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const result = await pool.query(
      `SELECT image_data, image_mime_type FROM imoveis im
       WHERE im.id = $1 AND EXISTS (
         SELECT 1 FROM proprietarios_adm_imoveis pai
         JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
         WHERE pai.imoveis_id = im.id AND u.id = $2
           AND u.tipo_pessoa = 'proprietario_adm'
       )`,
      [id.data, req.user!.userId],
    )
    const image = result.rows[0]
    if (
      !image?.image_data ||
      !["image/jpeg", "image/png", "image/webp"].includes(image.image_mime_type)
    ) {
      throw new ApiError(404, "Imagem não encontrada.")
    }

    res.setHeader("Cache-Control", "private, no-store")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.type(image.image_mime_type).send(image.image_data)
  }),
)

app.get(
  "/api/properties/:id",

  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)

    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const result = await pool.query(
      `SELECT im.id::text AS id, im.nome AS name, im.endereco AS address,
              im.cep AS postal_code, im.cidade AS city, im.estado AS state,
              CASE WHEN im.image_data IS NOT NULL AND im.image_mime_type IS NOT NULL
                   THEN '/api/properties/' || im.id::text || '/image'
                   ELSE NULL END AS image_url,
              coalesce((
                SELECT json_agg(json_build_object('id', pa.id::text, 'name', pa.nome)
                                ORDER BY pa.nome)
                FROM proprietarios_adm_imoveis pai
                JOIN proprietarios_adm pa ON pa.id = pai.proprietarios_adm_id
                WHERE pai.imoveis_id = im.id
                  AND pa.created_by_user_id = $2
              ), '[]'::json) AS owners,
              (SELECT count(*)::int FROM equipamentos e
               WHERE e.imovel_id = im.id) AS equipment_count
       FROM imoveis im
       WHERE im.id = $1 AND EXISTS (
         SELECT 1 FROM proprietarios_adm_imoveis pai
         JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
         WHERE pai.imoveis_id = im.id AND u.id = $2
           AND u.tipo_pessoa = 'proprietario_adm'
       )`,

      [id.data, req.user!.userId],
    )

    if (!result.rowCount) throw new ApiError(404, "Imóvel não encontrado.")

    res.json({ property: result.rows[0] })
  }),
)

app.post(
  "/api/properties",

  asyncRoute(async (req, res) => {
    const parsed = propertySchema.safeParse(req.body)

    if (!parsed.success) throw new ApiError(400, "Confira os dados do imóvel.")

    const image = parseImageDataUrl(parsed.data.imageDataUrl)
    if (parsed.data.removeImage) {
      throw new ApiError(400, "Não é possível remover a imagem ao criar o imóvel.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const personId = await getUserPersonId(req.user!.userId, client)
      if (!parsed.data.ownerIds.includes(personId)) {
        throw new ApiError(
          403,
          "O imóvel deve estar vinculado ao administrador da conta.",
        )
      }

      const ownerCheck = await client.query(
        `SELECT id FROM proprietarios_adm
         WHERE id = ANY($1::bigint[]) AND created_by_user_id = $2`,
        [parsed.data.ownerIds, req.user!.userId],
      )
      if (ownerCheck.rowCount !== parsed.data.ownerIds.length) {
        throw new ApiError(
          400,
          "Um ou mais administradores selecionados não foram encontrados.",
        )
      }

      const property = await client.query(
        `INSERT INTO imoveis
           (nome, endereco, cep, cidade, estado, image_data, image_mime_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id::text AS id`,
        [
          parsed.data.name,
          parsed.data.address,
          parsed.data.postalCode || null,
          parsed.data.city || null,
          parsed.data.state?.toUpperCase() || null,
          image?.data || null,
          image?.mimeType || null,
        ],
      )

      for (const ownerId of parsed.data.ownerIds) {
        await client.query(
          `INSERT INTO proprietarios_adm_imoveis (proprietarios_adm_id, imoveis_id)
           VALUES ($1, $2)`,
          [ownerId, property.rows[0].id],
        )
      }

      await client.query("COMMIT")
      res.status(201).json({ id: property.rows[0].id })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.patch(
  "/api/properties/:id",

  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const parsed = propertySchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, "Confira os dados do imóvel.")

    const image = parseImageDataUrl(parsed.data.imageDataUrl)
    if (parsed.data.removeImage && image) {
      throw new ApiError(400, "Envie uma imagem ou solicite a remoção, não ambos.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      await requirePropertyAccess(req.user!.userId, id.data, client)
      const personId = await getUserPersonId(req.user!.userId, client)
      if (!parsed.data.ownerIds.includes(personId)) {
        throw new ApiError(
          403,
          "O imóvel deve continuar vinculado ao administrador da conta.",
        )
      }

      const ownerCheck = await client.query(
        `SELECT id FROM proprietarios_adm
         WHERE id = ANY($1::bigint[]) AND created_by_user_id = $2`,
        [parsed.data.ownerIds, req.user!.userId],
      )
      if (ownerCheck.rowCount !== parsed.data.ownerIds.length) {
        throw new ApiError(
          400,
          "Um ou mais administradores selecionados não foram encontrados.",
        )
      }

      const property = await client.query(
        `UPDATE imoveis
         SET nome = $2, endereco = $3, cep = $4, cidade = $5, estado = $6,
             image_data = CASE
               WHEN $7 THEN NULL
               WHEN $8::bytea IS NOT NULL THEN $8::bytea
               ELSE image_data
             END,
             image_mime_type = CASE
               WHEN $7 THEN NULL
               WHEN $9::text IS NOT NULL THEN $9::text
               ELSE image_mime_type
             END
         WHERE id = $1
         RETURNING id`,
        [
          id.data,
          parsed.data.name,
          parsed.data.address,
          parsed.data.postalCode || null,
          parsed.data.city || null,
          parsed.data.state?.toUpperCase() || null,
          parsed.data.removeImage,
          image?.data || null,
          image?.mimeType || null,
        ],
      )
      if (!property.rowCount) {
        throw new ApiError(404, "Imóvel não encontrado.")
      }

      await client.query(
        "DELETE FROM proprietarios_adm_imoveis WHERE imoveis_id = $1",
        [id.data],
      )
      for (const ownerId of parsed.data.ownerIds) {
        await client.query(
          `INSERT INTO proprietarios_adm_imoveis (proprietarios_adm_id, imoveis_id)
           VALUES ($1, $2)`,
          [ownerId, id.data],
        )
      }

      await client.query("COMMIT")
      res.status(204).end()
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.get(
  "/api/properties/:propertyId/equipment",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    if (!propertyId.success) {
      throw new ApiError(400, "Identificador do imóvel inválido.")
    }

    await requirePropertyAccess(req.user!.userId, propertyId.data)

    const result = await pool.query(
      `SELECT e.id::text AS id, e.nome AS name, e.descricao AS description,
              e.observacao AS observation,
              coalesce((
                SELECT json_agg(json_build_object(
                  'id', f.id::text,
                  'url', '/api/properties/' || e.imovel_id::text ||
                         '/equipment/' || e.id::text || '/photos/' || f.id::text
                ) ORDER BY f.id)
                FROM equipamentos_fotos f
                WHERE f.equipamento_id = e.id AND f.imovel_id = e.imovel_id
              ), '[]'::json) AS photos
       FROM equipamentos e
       WHERE e.imovel_id = $1
       ORDER BY e.id DESC`,
      [propertyId.data],
    )
    res.json({
      equipment: result.rows.map((item) => ({
        ...item,
        name: item.name || "",
        description: item.description || "",
        observation: item.observation || "",
      })),
    })
  }),
)

app.post(
  "/api/properties/:propertyId/equipment",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    if (!propertyId.success) {
      throw new ApiError(400, "Identificador do imóvel inválido.")
    }
    const parsed = equipmentSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, "Confira os dados do equipamento.")

    await requirePropertyAccess(req.user!.userId, propertyId.data)

    const result = await pool.query(
      `INSERT INTO equipamentos (imovel_id, nome, descricao, observacao)
       VALUES ($1, $2, $3, $4) RETURNING id::text AS id`,
      [
        propertyId.data,
        parsed.data.name,
        parsed.data.description || null,
        parsed.data.observation || null,
      ],
    )
    res.status(201).json({ id: result.rows[0].id })
  }),
)

app.patch(
  "/api/properties/:propertyId/equipment/:equipmentId",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    const equipmentId = positiveId.safeParse(req.params.equipmentId)
    if (!propertyId.success || !equipmentId.success) {
      throw new ApiError(400, "Identificador inválido.")
    }
    const parsed = equipmentSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, "Confira os dados do equipamento.")

    await requirePropertyAccess(req.user!.userId, propertyId.data)
    const result = await pool.query(
      `UPDATE equipamentos SET nome = $3, descricao = $4, observacao = $5
       WHERE id = $1 AND imovel_id = $2 RETURNING id`,
      [
        equipmentId.data,
        propertyId.data,
        parsed.data.name,
        parsed.data.description || null,
        parsed.data.observation || null,
      ],
    )
    if (!result.rowCount) throw new ApiError(404, "Equipamento não encontrado.")
    res.status(204).end()
  }),
)

app.delete(
  "/api/properties/:propertyId/equipment/:equipmentId",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    const equipmentId = positiveId.safeParse(req.params.equipmentId)
    if (!propertyId.success || !equipmentId.success) {
      throw new ApiError(400, "Identificador inválido.")
    }

    await requirePropertyAccess(req.user!.userId, propertyId.data)
    const result = await pool.query(
      "DELETE FROM equipamentos WHERE id = $1 AND imovel_id = $2 RETURNING id",
      [equipmentId.data, propertyId.data],
    )
    if (!result.rowCount) throw new ApiError(404, "Equipamento não encontrado.")
    res.status(204).end()
  }),
)

app.post(
  "/api/properties/:propertyId/equipment/:equipmentId/photos",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    const equipmentId = positiveId.safeParse(req.params.equipmentId)
    if (!propertyId.success || !equipmentId.success) {
      throw new ApiError(400, "Identificador inválido.")
    }
    const parsed = equipmentPhotoSchema.safeParse(req.body)
    if (!parsed.success) throw new ApiError(400, "Envie uma imagem válida.")
    const image = parseImageDataUrl(parsed.data.imageDataUrl)
    if (!image) throw new ApiError(400, "Selecione uma imagem para enviar.")

    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await requirePropertyAccess(req.user!.userId, propertyId.data, client)
      const equipment = await client.query(
        "SELECT id FROM equipamentos WHERE id = $1 AND imovel_id = $2 FOR UPDATE",
        [equipmentId.data, propertyId.data],
      )
      if (!equipment.rowCount) {
        throw new ApiError(404, "Equipamento não encontrado neste imóvel.")
      }

      const count = await client.query(
        `SELECT count(*)::int AS total FROM equipamentos_fotos
         WHERE equipamento_id = $1 AND imovel_id = $2`,
        [equipmentId.data, propertyId.data],
      )
      if (count.rows[0].total >= maxEquipmentPhotos) {
        throw new ApiError(
          400,
          `Cada equipamento pode ter até ${maxEquipmentPhotos} fotos.`,
        )
      }

      const photo = await client.query(
        `INSERT INTO equipamentos_fotos
           (equipamento_id, imovel_id, image_data, image_mime_type)
         VALUES ($1, $2, $3, $4) RETURNING id::text AS id`,
        [
          equipmentId.data,
          propertyId.data,
          image.data,
          image.mimeType,
        ],
      )
      await client.query("COMMIT")
      res.status(201).json({ id: photo.rows[0].id })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.get(
  "/api/properties/:propertyId/equipment/:equipmentId/photos/:photoId",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    const equipmentId = positiveId.safeParse(req.params.equipmentId)
    const photoId = positiveId.safeParse(req.params.photoId)
    if (!propertyId.success || !equipmentId.success || !photoId.success) {
      throw new ApiError(400, "Identificador inválido.")
    }

    await requirePropertyAccess(req.user!.userId, propertyId.data)
    const result = await pool.query(
      `SELECT image_data, image_mime_type FROM equipamentos_fotos
       WHERE id = $1 AND equipamento_id = $2 AND imovel_id = $3`,
      [photoId.data, equipmentId.data, propertyId.data],
    )
    const photo = result.rows[0]
    if (
      !photo?.image_data ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.image_mime_type)
    ) {
      throw new ApiError(404, "Foto do equipamento não encontrada.")
    }
    res.setHeader("Cache-Control", "private, no-store")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.type(photo.image_mime_type).send(photo.image_data)
  }),
)

app.delete(
  "/api/properties/:propertyId/equipment/:equipmentId/photos/:photoId",

  asyncRoute(async (req, res) => {
    const propertyId = positiveId.safeParse(req.params.propertyId)
    const equipmentId = positiveId.safeParse(req.params.equipmentId)
    const photoId = positiveId.safeParse(req.params.photoId)
    if (!propertyId.success || !equipmentId.success || !photoId.success) {
      throw new ApiError(400, "Identificador inválido.")
    }

    await requirePropertyAccess(req.user!.userId, propertyId.data)
    const result = await pool.query(
      `DELETE FROM equipamentos_fotos
       WHERE id = $1 AND equipamento_id = $2 AND imovel_id = $3
       RETURNING id`,
      [photoId.data, equipmentId.data, propertyId.data],
    )
    if (!result.rowCount) throw new ApiError(404, "Foto não encontrada.")
    res.status(204).end()
  }),
)

app.get(
  "/api/people",

  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT 'proprietario_adm:' || id::text AS id, nome AS full_name,
              'administrator'::text AS kind, email, telefone AS phone,
              cpf_cnpj, NULL::text AS pix_code,
              archived_at IS NOT NULL AS is_archived
       FROM proprietarios_adm
       WHERE created_by_user_id = $1
       UNION ALL
       SELECT 'preposto:' || id::text, nome, 'proxy'::text, email,
              telefone, cpf_cnpj, NULL::text, archived_at IS NOT NULL
       FROM prepostos
       WHERE created_by_user_id = $1
       UNION ALL
       SELECT 'prestador_servico:' || id::text, nome, 'provider'::text, email,
              telefone, cpf_cnpj, codigo_pix, archived_at IS NOT NULL
       FROM prestadores_servico
       WHERE created_by_user_id = $1
       ORDER BY full_name`,
      [req.user!.userId],
    )

    res.json({ people: result.rows })
  }),
)

app.post(
  "/api/people",

  asyncRoute(async (req, res) => {
    const parsed = personSchema.safeParse(req.body)

    if (!parsed.success) throw new ApiError(400, "Confira os dados da pessoa.")

    const { fullName, email, phone, cpfCnpj, pixCode, kind } = parsed.data

    const params = [
      fullName,
      email || null,
      phone || null,
      cpfCnpj || null,
      req.user!.userId,
    ]

    const insertByKind = {
      administrator: `INSERT INTO proprietarios_adm
                         (nome, email, telefone, cpf_cnpj, created_by_user_id)
                       VALUES ($1, $2, $3, $4, $5) RETURNING id`,

      proxy: `INSERT INTO prepostos
                (nome, email, telefone, cpf_cnpj, tipo, status, created_by_user_id)
              VALUES ($1, $2, $3, $4, 'preposto', 'ativo', $5) RETURNING id`,

      provider: `INSERT INTO prestadores_servico
                   (nome, email, telefone, cpf_cnpj, codigo_pix, created_by_user_id)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    } satisfies Record<PersonKind, string>

    const result =
      kind === "provider"
        ? await pool.query(insertByKind.provider, [
            fullName,
            email || null,
            phone || null,
            cpfCnpj || null,
            pixCode || null,
            req.user!.userId,
          ])
        : await pool.query(insertByKind[kind], params)

    const prefixes: Record<PersonKind, string> = {
      administrator: "proprietario_adm",
      proxy: "preposto",
      provider: "prestador_servico",
    }
    res.status(201).json({ id: `${prefixes[kind]}:${result.rows[0].id}` })
  }),
)

app.patch(
  "/api/people/:id",
  asyncRoute(async (req, res) => {
    const match =
      typeof req.params.id === "string"
        ? /^(proprietario_adm|preposto|prestador_servico):([1-9]\d*)$/.exec(
            req.params.id,
          )
        : null
    const parsed = personUpdateSchema.safeParse(req.body)
    if (!match) throw new ApiError(400, "Identificador de pessoa inválido.")
    if (!parsed.success) throw new ApiError(400, "Confira os dados da pessoa.")

    const [, prefix, id] = match
    const tables = {
      proprietario_adm: "proprietarios_adm",
      preposto: "prepostos",
      prestador_servico: "prestadores_servico",
    } as const
    const table =
      prefix === "proprietario_adm"
        ? tables.proprietario_adm
        : prefix === "preposto"
          ? tables.preposto
          : tables.prestador_servico
    const values = [
      parsed.data.fullName,
      parsed.data.email || null,
      parsed.data.phone || null,
      parsed.data.cpfCnpj || null,
    ]
    const result =
      prefix === "prestador_servico"
        ? await pool.query(
            `UPDATE ${table}
             SET nome = $1, email = $2, telefone = $3, cpf_cnpj = $4,
                 codigo_pix = $5
             WHERE id = $6 AND created_by_user_id = $7
             RETURNING id`,
            [...values, parsed.data.pixCode || null, id, req.user!.userId],
          )
        : await pool.query(
            `UPDATE ${table}
             SET nome = $1, email = $2, telefone = $3, cpf_cnpj = $4
             WHERE id = $5 AND created_by_user_id = $6
             RETURNING id`,
            [...values, id, req.user!.userId],
          )

    if (!result.rowCount) throw new ApiError(404, "Pessoa não encontrada.")
    res.status(204).end()
  }),
)

app.patch(
  "/api/people/:id/status",
  asyncRoute(async (req, res) => {
    const match =
      typeof req.params.id === "string"
        ? /^(proprietario_adm|preposto|prestador_servico):([1-9]\d*)$/.exec(
            req.params.id,
          )
        : null
    const parsed = z.object({ archived: z.boolean() }).safeParse(req.body)
    if (!match) throw new ApiError(400, "Identificador de pessoa inválido.")
    if (!parsed.success) throw new ApiError(400, "Estado de pessoa inválido.")

    const [, prefix, id] = match
    const tables = {
      proprietario_adm: "proprietarios_adm",
      preposto: "prepostos",
      prestador_servico: "prestadores_servico",
    } as const
    const table =
      prefix === "proprietario_adm"
        ? tables.proprietario_adm
        : prefix === "preposto"
          ? tables.preposto
          : tables.prestador_servico
    const result = await pool.query(
      `UPDATE ${table}
       SET archived_at = CASE
         WHEN $1 THEN coalesce(archived_at, now())
         ELSE NULL
       END
       WHERE id = $2 AND created_by_user_id = $3
       RETURNING id`,
      [parsed.data.archived, id, req.user!.userId],
    )
    if (!result.rowCount) throw new ApiError(404, "Pessoa não encontrada.")
    res.status(204).end()
  }),
)

app.get(
  "/api/operation/tasks",
  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT t.id::text AS id, t.nome AS name, t.observacao AS observation,
              t.imovel_id::text AS property_id, im.nome AS property_name,
              t.dt_inicio AS start_at, t.dt_fim AS end_at, t.status,
              t.executor_tipo AS executor_type,
              coalesce(pa.id, ps.id)::text AS executor_id,
              coalesce(pa.nome, ps.nome) AS executor_name,
              coalesce((
                SELECT json_agg(json_build_object(
                  'id', tc.id::text,
                  'source_checklist_id', tc.checklist_origem_id::text,
                  'title', tc.titulo,
                  'items', coalesce((
                    SELECT json_agg(json_build_object(
                      'id', ci.id::text, 'title', ci.titulo,
                      'description', ci.descricao, 'rule', ci.regra,
                      'done', ci.concluido
                    ) ORDER BY ci.posicao, ci.id)
                    FROM tarefas_operacao_checklist_items ci
                    WHERE ci.tarefa_checklist_id = tc.id
                  ), '[]'::json)
                ) ORDER BY tc.posicao, tc.id)
                FROM tarefas_operacao_checklists tc
                WHERE tc.tarefa_id = t.id
              ), '[]'::json) AS checklists
       FROM tarefas_operacao t
       JOIN imoveis im ON im.id = t.imovel_id
       LEFT JOIN proprietarios_adm pa
         ON pa.id = t.executor_administrador_id
       LEFT JOIN prestadores_servico ps
         ON ps.id = t.executor_prestador_id
       WHERE t.created_by_user_id = $1
         AND EXISTS (
           SELECT 1 FROM proprietarios_adm_imoveis pai
           JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
           WHERE pai.imoveis_id = t.imovel_id AND u.id = $1
             AND u.tipo_pessoa = 'proprietario_adm'
         )
       ORDER BY t.dt_inicio NULLS LAST, t.id DESC`,
      [req.user!.userId],
    )
    res.json({ tasks: result.rows })
  }),
)

app.post(
  "/api/operation/tasks",
  asyncRoute(async (req, res) => {
    const parsed = operationTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, "Confira os dados obrigatórios da tarefa.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await requirePropertyAccess(
        req.user!.userId,
        parsed.data.propertyId,
        client,
      )
      await requireTaskExecutor(
        req.user!.userId,
        parsed.data.executorType,
        parsed.data.executorId,
        client,
      )

      const task = await client.query(
        `INSERT INTO tarefas_operacao (
           imovel_id, nome, observacao, dt_inicio, dt_fim, executor_tipo,
           executor_administrador_id, executor_prestador_id, created_by_user_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id::text AS id`,
        [
          parsed.data.propertyId,
          parsed.data.name,
          parsed.data.observation,
          parsed.data.startAt || null,
          parsed.data.endAt || null,
          parsed.data.executorType,
          parsed.data.executorType === "administrator"
            ? parsed.data.executorId
            : null,
          parsed.data.executorType === "provider"
            ? parsed.data.executorId
            : null,
          req.user!.userId,
        ],
      )
      await syncTaskChecklists(
        task.rows[0].id,
        req.user!.userId,
        parsed.data.checklistIds,
        client,
      )
      await client.query("COMMIT")
      res.status(201).json({ id: task.rows[0].id })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.patch(
  "/api/operation/tasks/:id",
  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    const parsed = operationTaskSchema.safeParse(req.body)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")
    if (!parsed.success) {
      throw new ApiError(400, "Confira os dados obrigatórios da tarefa.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const currentTask = await client.query(
        `SELECT id, executor_tipo, executor_administrador_id::text AS administrator_id,
                executor_prestador_id::text AS provider_id
         FROM tarefas_operacao
         WHERE id = $1 AND created_by_user_id = $2
         FOR UPDATE`,
        [id.data, req.user!.userId],
      )
      if (!currentTask.rowCount) throw new ApiError(404, "Tarefa não encontrada.")
      const currentExecutor = currentTask.rows[0]
      const executorUnchanged =
        currentExecutor.executor_tipo === parsed.data.executorType &&
        (parsed.data.executorType === "administrator"
          ? currentExecutor.administrator_id === parsed.data.executorId
          : currentExecutor.provider_id === parsed.data.executorId)

      await requirePropertyAccess(
        req.user!.userId,
        parsed.data.propertyId,
        client,
      )
      await requireTaskExecutor(
        req.user!.userId,
        parsed.data.executorType,
        parsed.data.executorId,
        client,
        executorUnchanged,
      )
      await client.query(
        `UPDATE tarefas_operacao
         SET imovel_id = $2, nome = $3, observacao = $4,
             dt_inicio = $5, dt_fim = $6, executor_tipo = $7,
             executor_administrador_id = $8, executor_prestador_id = $9
         WHERE id = $1 AND created_by_user_id = $10`,
        [
          id.data,
          parsed.data.propertyId,
          parsed.data.name,
          parsed.data.observation,
          parsed.data.startAt || null,
          parsed.data.endAt || null,
          parsed.data.executorType,
          parsed.data.executorType === "administrator"
            ? parsed.data.executorId
            : null,
          parsed.data.executorType === "provider"
            ? parsed.data.executorId
            : null,
          req.user!.userId,
        ],
      )
      await syncTaskChecklists(
        id.data,
        req.user!.userId,
        parsed.data.checklistIds,
        client,
      )
      await client.query("COMMIT")
      res.status(204).end()
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.patch(
  "/api/operation/tasks/:id/status",
  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    const parsed = operationTaskStatusSchema.safeParse(req.body)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")
    if (!parsed.success) throw new ApiError(400, "Status de tarefa inválido.")

    const task = await pool.query(
      `UPDATE tarefas_operacao t
       SET status = $3
       WHERE t.id = $1 AND t.created_by_user_id = $2
         AND EXISTS (
           SELECT 1 FROM proprietarios_adm_imoveis pai
           JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
           WHERE pai.imoveis_id = t.imovel_id AND u.id = $2
             AND u.tipo_pessoa = 'proprietario_adm'
         )
       RETURNING id`,
      [id.data, req.user!.userId, parsed.data.status],
    )
    if (!task.rowCount) throw new ApiError(404, "Tarefa não encontrada.")
    res.status(204).end()
  }),
)

app.patch(
  "/api/operation/tasks/:taskId/checklist-items/:itemId",
  asyncRoute(async (req, res) => {
    const taskId = positiveId.safeParse(req.params.taskId)
    const itemId = positiveId.safeParse(req.params.itemId)
    const parsed = z.object({ completed: z.boolean() }).safeParse(req.body)
    if (!taskId.success || !itemId.success) {
      throw new ApiError(400, "Identificador inválido.")
    }
    if (!parsed.success) throw new ApiError(400, "Estado do item inválido.")

    const item = await pool.query(
      `UPDATE tarefas_operacao_checklist_items ci
       SET concluido = $3
       WHERE ci.id = $1
         AND EXISTS (
           SELECT 1
           FROM tarefas_operacao_checklists tc
           JOIN tarefas_operacao t ON t.id = tc.tarefa_id
           JOIN proprietarios_adm_imoveis pai ON pai.imoveis_id = t.imovel_id
           JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
           WHERE tc.id = ci.tarefa_checklist_id
             AND t.id = $2 AND t.created_by_user_id = $4
             AND u.id = $4 AND u.tipo_pessoa = 'proprietario_adm'
         )
       RETURNING ci.id`,
      [itemId.data, taskId.data, parsed.data.completed, req.user!.userId],
    )
    if (!item.rowCount) {
      throw new ApiError(404, "Item de checklist não encontrado.")
    }
    res.status(204).end()
  }),
)

app.delete(
  "/api/operation/tasks/:id",
  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const task = await pool.query(
      `DELETE FROM tarefas_operacao t
       WHERE t.id = $1 AND t.created_by_user_id = $2
         AND EXISTS (
           SELECT 1 FROM proprietarios_adm_imoveis pai
           JOIN usuarios u ON u.pessoa_id = pai.proprietarios_adm_id
           WHERE pai.imoveis_id = t.imovel_id AND u.id = $2
             AND u.tipo_pessoa = 'proprietario_adm'
         )
       RETURNING id`,
      [id.data, req.user!.userId],
    )
    if (!task.rowCount) throw new ApiError(404, "Tarefa não encontrada.")
    res.status(204).end()
  }),
)

app.get(
  "/api/tasks",

  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT 'checklist:' || c.id::text AS id, c.titulo AS title,
              'inspection'::text AS category, NULL::timestamptz AS due_at,
              c.status, 'Checklist'::text AS property_name,
              'checklist'::text AS source,
              lower(c.status) IN ('concluido', 'concluída', 'concluida', 'completed') AS done
       FROM checklists c
       WHERE c.tipo = 'personalizado' AND c.created_by_user_id = $1
       ORDER BY due_at NULLS LAST, id`,
      [req.user!.userId],
    )

    res.json({ tasks: result.rows })
  }),
)

app.patch(
  "/api/tasks/:id",
  asyncRoute(async (req, res) => {
    const rawId = req.params.id
    if (typeof rawId !== "string" || !rawId.startsWith("checklist:")) {
      throw new ApiError(404, "Checklist não encontrado.")
    }
    const id = positiveId.safeParse(rawId.slice("checklist:".length))
    const parsed = z.object({ completed: z.boolean() }).safeParse(req.body)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")
    if (!parsed.success) throw new ApiError(400, "Estado do checklist inválido.")

    const result = await pool.query(
      `UPDATE checklists SET status = $2
       WHERE id = $1 AND tipo = 'personalizado'
         AND created_by_user_id = $3
       RETURNING id`,
      [id.data, parsed.data.completed ? "concluido" : "pendente", req.user!.userId],
    )
    if (!result.rowCount) {
      throw new ApiError(404, "Checklist não encontrado.")
    }
    res.status(204).end()
  }),
)

app.get(
  "/api/checklists",

  asyncRoute(async (req, res) => {
    const [checklists, templates] = await Promise.all([
      pool.query(
        `SELECT c.id::text AS id, c.titulo AS title, c.status,
                c.modelo_padrao_id::text AS source_template_id,
                coalesce((
                  SELECT json_agg(json_build_object(
                    'id', ci.id::text, 'title', ci.titulo,
                    'description', ci.descricao, 'rule', ci.regra
                  ) ORDER BY ci.posicao, ci.id)
                  FROM checklist_items ci WHERE ci.checklist_id = c.id
                ), '[]'::json) AS items
         FROM checklists c
         WHERE c.tipo = 'personalizado' AND c.created_by_user_id = $1
         ORDER BY c.id DESC`,
        [req.user!.userId],
      ),
      pool.query(
      `SELECT c.id::text AS id, c.titulo AS title, c.status, c.descricao AS description,
              c.tipo AS type,
              coalesce((
                SELECT json_agg(json_build_object(
                  'id', ci.id::text, 'title', ci.titulo,
                  'description', ci.descricao, 'rule', ci.regra
                ) ORDER BY ci.posicao, ci.id)
                FROM checklist_items ci WHERE ci.checklist_id = c.id
              ), '[]'::json) AS items
       FROM checklists c
       WHERE c.tipo = 'padrao'
       ORDER BY c.id DESC`,
      ),
    ])

    res.json({ checklists: checklists.rows, templates: templates.rows })
  }),
)

app.post(
  "/api/checklists",

  asyncRoute(async (req, res) => {
    const parsed = checklistSchema.safeParse(req.body)

    if (!parsed.success) {
      throw new ApiError(400, "Confira os dados do checklist.")
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      const checklist = await client.query(
        `INSERT INTO checklists (titulo, status, tipo, created_by_user_id)
         VALUES ($1, 'pendente', 'personalizado', $2)
         RETURNING id`,

        [parsed.data.title, req.user!.userId],
      )

      for (const [position, title] of parsed.data.items.entries()) {
        await client.query(
          "INSERT INTO checklist_items (checklist_id, titulo, posicao) VALUES ($1, $2, $3)",

          [checklist.rows[0].id, title, position],
        )
      }

      await client.query("COMMIT")

      res.status(201).json({ id: String(checklist.rows[0].id) })
    } catch (error) {
      await client.query("ROLLBACK")

      throw error
    } finally {
      client.release()
    }
  }),
)

app.post(
  "/api/checklists/:templateId/subscribe",

  asyncRoute(async (req, res) => {
    const templateId = positiveId.safeParse(req.params.templateId)
    if (!templateId.success) {
      throw new ApiError(400, "Identificador de checklist inválido.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const template = await client.query(
        `SELECT id, titulo FROM checklists
         WHERE id = $1 AND tipo = 'padrao'
         FOR SHARE`,
        [templateId.data],
      )
      if (!template.rowCount) {
        throw new ApiError(404, "Checklist padrão não encontrado.")
      }

      const existing = await client.query(
        `SELECT id FROM checklists
         WHERE created_by_user_id = $1 AND modelo_padrao_id = $2
         LIMIT 1`,
        [req.user!.userId, templateId.data],
      )
      if (existing.rowCount) {
        throw new ApiError(409, "Este checklist já está na sua lista.")
      }

      const checklist = await client.query(
        `INSERT INTO checklists
           (titulo, status, tipo, created_by_user_id, modelo_padrao_id)
         VALUES ($1, 'pendente', 'personalizado', $2, $3)
         ON CONFLICT (created_by_user_id, modelo_padrao_id)
           WHERE modelo_padrao_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [template.rows[0].titulo, req.user!.userId, templateId.data],
      )
      if (!checklist.rowCount) {
        throw new ApiError(409, "Este checklist já está na sua lista.")
      }

      await client.query(
        `INSERT INTO checklist_items (checklist_id, titulo, posicao, descricao, regra)
         SELECT $1, titulo, posicao, descricao, regra
         FROM checklist_items
         WHERE checklist_id = $2
         ORDER BY posicao, id`,
        [checklist.rows[0].id, templateId.data],
      )

      await client.query("COMMIT")
      res.status(201).json({ id: String(checklist.rows[0].id) })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.patch(
  "/api/checklists/:id",

  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const parsed = checklistSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ApiError(400, "Confira os dados do checklist.")
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const checklist = await client.query(
        `UPDATE checklists
         SET titulo = $1
         WHERE id = $2 AND tipo = 'personalizado'
           AND created_by_user_id = $3
         RETURNING id`,
        [parsed.data.title, id.data, req.user!.userId],
      )
      if (!checklist.rowCount) {
        throw new ApiError(404, "Checklist não encontrado na sua lista.")
      }

      await client.query(
        "DELETE FROM checklist_items WHERE checklist_id = $1",
        [id.data],
      )
      for (const [position, title] of parsed.data.items.entries()) {
        await client.query(
          `INSERT INTO checklist_items (checklist_id, titulo, posicao)
           VALUES ($1, $2, $3)`,
          [id.data, title, position],
        )
      }

      await client.query("COMMIT")
      res.status(204).end()
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.delete(
  "/api/checklists/:id",

  asyncRoute(async (req, res) => {
    const id = positiveId.safeParse(req.params.id)
    if (!id.success) throw new ApiError(400, "Identificador inválido.")

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const checklist = await client.query(
        `SELECT id FROM checklists
         WHERE id = $1 AND tipo = 'personalizado'
           AND created_by_user_id = $2
         FOR UPDATE`,
        [id.data, req.user!.userId],
      )
      if (!checklist.rowCount) {
        throw new ApiError(404, "Checklist não encontrado na sua lista.")
      }

      await client.query(
        "DELETE FROM checklist_items WHERE checklist_id = $1",
        [id.data],
      )
      await client.query("DELETE FROM checklists WHERE id = $1", [id.data])

      await client.query("COMMIT")
      res.status(204).end()
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }),
)

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Dados inválidos.",

      details: err.issues.map((issue) => issue.message),
    })
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message })
  }

  const requestError = err as { type?: string }
  if (requestError.type === "entity.too.large") {
    return res.status(413).json({
      error: "A solicitação é muito grande. A imagem deve ter no máximo 5 MB.",
    })
  }

  const dbError = err as { code?: string }

  if (dbError.code === "23505") {
    return res.status(409).json({ error: "Este cadastro já existe." })
  }

  console.error("Erro não tratado na API:", err)

  res.status(500).json({ error: "Erro interno ao processar a solicitação." })
})

type PersonKind = "administrator" | "proxy" | "provider"

let server: ReturnType<typeof app.listen> | undefined

async function start() {
  try {
    const client = await pool.connect()

    try {
      await client.query("SELECT 1")
    } finally {
      client.release()
    }

    console.log("Conexão com PostgreSQL estabelecida.")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(`Falha ao conectar ao PostgreSQL: ${message}`)

    await pool.end()

    process.exitCode = 1

    return
  }

  server = app.listen(port, "0.0.0.0", () => {
    console.log(`API GesLocPlus disponível na porta ${port}.`)
  })

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Não foi possível iniciar a API: a porta ${port} já está em uso. Verifique se outra instância já está rodando.`,
      )
    } else {
      console.error(`Falha ao iniciar a API:`, error.message)
    }

    void pool.end()

    process.exitCode = 1
  })
}

async function shutdown() {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()))
    })
  }

  await pool.end()
}

process.on("SIGINT", () => void shutdown())

process.on("SIGTERM", () => void shutdown())

void start()
