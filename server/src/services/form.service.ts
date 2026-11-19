import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/error'
import { makeShareId, validateSubmission, type FormSchema } from '../lib/schema'

const EMPTY_SCHEMA: FormSchema = { title: '未命名表单', fields: [] }

function parseSchema(raw: string): FormSchema {
  try {
    const value = JSON.parse(raw)
    return { title: value.title ?? '未命名表单', fields: Array.isArray(value.fields) ? value.fields : [] }
  } catch {
    return EMPTY_SCHEMA
  }
}

export async function listForms(ownerId: string) {
  const rows = await prisma.form.findMany({
    where: { ownerId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { submissions: true } } },
  })

  return rows.map((f) => ({
    id: f.id,
    title: f.title,
    status: f.status,
    version: f.version,
    shareId: f.shareId,
    submissions: f._count.submissions,
    updatedAt: f.updatedAt,
  }))
}

export async function createForm(ownerId: string, title: string) {
  const schema: FormSchema = { title, fields: [] }

  const form = await prisma.form.create({
    data: {
      title,
      schema: JSON.stringify(schema),
      shareId: makeShareId(),
      ownerId,
      versions: { create: { version: 1, schema: JSON.stringify(schema) } },
    },
  })

  return { id: form.id, title: form.title, version: form.version, status: form.status, shareId: form.shareId }
}

export async function getForm(ownerId: string, id: string) {
  const form = await prisma.form.findUnique({ where: { id } })
  if (!form || form.ownerId !== ownerId) throw new AppError(404, '表单不存在')

  return {
    id: form.id,
    title: form.title,
    status: form.status,
    version: form.version,
    shareId: form.shareId,
    schema: parseSchema(form.schema),
    updatedAt: form.updatedAt,
  }
}

/**
 * 保存 schema。
 * 每次保存版本号 +1，并把这一版的 schema 存进 FormVersion 快照 ——
 * 这样以后表单改了，老提交仍能用当时的 schema 正确渲染。
 */
export async function saveForm(
  ownerId: string,
  id: string,
  input: { title?: string; schema: FormSchema },
) {
  const form = await prisma.form.findUnique({ where: { id } })
  if (!form || form.ownerId !== ownerId) throw new AppError(404, '表单不存在')

  const nextVersion = form.version + 1
  const schemaJson = JSON.stringify(input.schema)
  const title = input.title?.trim() || input.schema.title || form.title

  await prisma.$transaction([
    prisma.form.update({
      where: { id },
      data: { title, schema: schemaJson, version: nextVersion },
    }),
    prisma.formVersion.create({
      data: { formId: id, version: nextVersion, schema: schemaJson },
    }),
  ])

  return { id, title, version: nextVersion }
}

export async function setStatus(ownerId: string, id: string, status: 'draft' | 'published' | 'closed') {
  const form = await prisma.form.findUnique({ where: { id } })
  if (!form || form.ownerId !== ownerId) throw new AppError(404, '表单不存在')

  await prisma.form.update({ where: { id }, data: { status } })
  return { ok: true, status }
}

/** 公开取表单：只返回渲染需要的东西，不暴露 owner */
export async function getPublicForm(shareId: string) {
  const form = await prisma.form.findUnique({ where: { shareId } })
  if (!form) throw new AppError(404, '表单不存在或已关闭')
  if (form.status !== 'published') throw new AppError(403, '该表单未开放填写')

  return {
    title: form.title,
    version: form.version,
    schema: parseSchema(form.schema),
  }
}

/** 公开提交：服务端用同一套 schema 规则再校验一遍 */
export async function submit(shareId: string, data: Record<string, unknown>, ip: string) {
  const form = await prisma.form.findUnique({ where: { shareId } })
  if (!form) throw new AppError(404, '表单不存在或已关闭')
  if (form.status !== 'published') throw new AppError(403, '该表单未开放填写')

  const schema = parseSchema(form.schema)
  const errors = validateSubmission(schema, data)
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, Object.values(errors)[0])
  }

  const row = await prisma.submission.create({
    data: {
      formId: form.id,
      formVersion: form.version,
      data: JSON.stringify(data),
      ip,
    },
  })

  return { ok: true, id: row.id }
}

/** 提交记录：用每条记录当时的版本找回 schema，保证老数据也能正确展示 */
export async function listSubmissions(ownerId: string, formId: string) {
  const form = await prisma.form.findUnique({ where: { id: formId } })
  if (!form || form.ownerId !== ownerId) throw new AppError(404, '表单不存在')

  const [rows, versions] = await Promise.all([
    prisma.submission.findMany({ where: { formId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.formVersion.findMany({ where: { formId } }),
  ])

  const versionMap = new Map(versions.map((v) => [v.version, v.schema]))

  return {
    currentVersion: form.version,
    list: rows.map((r) => ({
      id: r.id,
      formVersion: r.formVersion,
      createdAt: r.createdAt,
      data: JSON.parse(r.data) as Record<string, unknown>,
      schema: parseSchema(versionMap.get(r.formVersion) ?? form.schema),
    })),
  }
}