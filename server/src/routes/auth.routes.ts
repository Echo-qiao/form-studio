import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler'
import { requireAuth } from '../middlewares/auth'
import * as authService from '../services/auth.service'

export const authRouter = Router()

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        email: z.string().email('邮箱格式不正确'),
        password: z.string().min(6, '密码至少 6 位').max(64),
        name: z.string().min(1, '请填写昵称').max(20),
      })
      .parse(req.body)
    res.status(201).json(await authService.register(input))
  }),
)

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body)
    res.json(await authService.login(input))
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await authService.getMe(req.user!.id))
  }),
)