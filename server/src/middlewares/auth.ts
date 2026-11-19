import type { RequestHandler } from 'express'
import { prisma } from '../lib/prisma'
import { verifyToken } from '../lib/jwt'

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: '请先登录' })
    return
  }

  try {
    const payload = verifyToken(header.slice(7))
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      res.status(401).json({ message: '账号不存在' })
      return
    }
    req.user = { id: user.id, email: user.email, name: user.name }
    next()
  } catch {
    res.status(401).json({ message: '登录已过期，请重新登录' })
  }
}