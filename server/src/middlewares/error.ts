import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ message: '接口不存在' })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: '参数校验失败',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message })
    return
  }

  if (err?.code === 'P2002') {
    res.status(409).json({ message: '记录已存在' })
    return
  }

  console.error('[unhandled error]', err)
  res.status(500).json({ message: '服务器内部错误' })
}