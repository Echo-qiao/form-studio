import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const schema = {
  title: '客户满意度调查',
  fields: [
    { id: 'f_name', type: 'text', label: '你的称呼', placeholder: '选填', maxLength: 20 },
    { id: 'f_score', type: 'radio', label: '整体满意度', required: true, options: ['非常满意', '一般', '不满意'] },
    { id: 'f_tags', type: 'checkbox', label: '你关注哪些方面', options: ['响应速度', '专业程度', '价格'] },
    { id: 'f_note', type: 'textarea', label: '还有什么建议', maxLength: 500 },
  ],
}

async function main() {
  const email = 'demo@form.com'
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    user = await prisma.user.create({
      data: { email, name: '演示用户', password: await bcrypt.hash('123456', 10) },
    })
    console.log('已创建演示账号 demo@form.com / 123456')
  }

  const exists = await prisma.form.findFirst({ where: { ownerId: user.id } })
  if (exists) {
    console.log('演示表单已存在，跳过')
    return
  }

  const json = JSON.stringify(schema)
  await prisma.form.create({
    data: {
      title: schema.title,
      schema: json,
      status: 'published',
      shareId: 'demoform',
      ownerId: user.id,
      versions: { create: { version: 1, schema: json } },
    },
  })
  console.log('已创建演示表单，公开地址：/f/demoform')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())