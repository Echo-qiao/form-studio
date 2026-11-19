import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler'
import { AppError } from '../middlewares/error'
import * as formService from '../services/form.service'

export const publicRouter = Router()

/** 匿名提交限流：同一 IP 对同一表单每分钟最多 10 次 */
const hits = new Map<string, { count: number; resetAt: number }>()
const LIMIT = 10
const WINDOW = 60 * 1000

function rateLimit(key: string) {
  const now = Date.now()
  const state = hits.get(key)
  if (!state || state.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW })
    return
  }
  state.count += 1
  if (state.count > LIMIT) throw new AppError(429, '提交过于频繁，请稍后再试')
}

publicRouter.get(
  '/:shareId',
  asyncHandler(async (req, res) => {
    res.json(await formService.getPublicForm(req.params.shareId))
  }),
)

publicRouter.post(
  '/:shareId/submit',
  asyncHandler(async (req, res) => {
    const ip = req.ip ?? 'unknown'
    rateLimit(`${ip}:${req.params.shareId}`)

    const input = z.object({ data: z.record(z.unknown()) }).parse(req.body)
    res.status(201).json(await formService.submit(req.params.shareId, input.data, ip))
  }),
)