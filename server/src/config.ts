import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4200),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 至少 16 位'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('环境变量配置有误：', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data