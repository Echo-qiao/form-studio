import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { AppError } from '../middlewares/error'

export async function register(input: { email: string; password: string; name: string }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } })
  if (exists) throw new AppError(409, '该邮箱已注册')

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: await bcrypt.hash(input.password, 10),
      name: input.name,
    },
  })

  return { token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } }
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  // 用户不存在与密码错误返回同一句，避免暴露邮箱是否注册过
  if (!user) throw new AppError(401, '邮箱或密码错误')

  const ok = await bcrypt.compare(input.password, user.password)
  if (!ok) throw new AppError(401, '邮箱或密码错误')

  return { token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(404, '用户不存在')
  return { id: user.id, email: user.email, name: user.name }
}