import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler'
import { requireAuth } from '../middlewares/auth'
import * as formService from '../services/form.service'

export const formsRouter = Router()

formsRouter.use(requireAuth)

const fieldSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.enum(['text', 'textarea', 'radio', 'checkbox', 'date', 'number', 'group']),
    label: z.string().min(1).max(60),
    required: z.boolean().optional(),
    placeholder: z.string().max(80).optional(),
    options: z.array(z.string().max(40)).max(30).optional(),
    maxLength: z.number().int().min(1).max(2000).optional(),
    children: z.array(fieldSchema).max(50).optional(),
  }),
)

const schemaShape = z.object({
  title: z.string().min(1).max(60),
  fields: z.array(fieldSchema).max(100),
})

formsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await formService.listForms(req.user!.id))
  }),
)

formsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = z.object({ title: z.string().min(1).max(60) }).parse(req.body)
    res.status(201).json(await formService.createForm(req.user!.id, input.title))
  }),
)

formsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await formService.getForm(req.user!.id, req.params.id))
  }),
)

formsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = z.object({ title: z.string().max(60).optional(), schema: schemaShape }).parse(req.body)
    res.json(await formService.saveForm(req.user!.id, req.params.id, input as never))
  }),
)

formsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const input = z.object({ status: z.enum(['draft', 'published', 'closed']) }).parse(req.body)
    res.json(await formService.setStatus(req.user!.id, req.params.id, input.status))
  }),
)

formsRouter.get(
  '/:id/submissions',
  asyncHandler(async (req, res) => {
    res.json(await formService.listSubmissions(req.user!.id, req.params.id))
  }),
)