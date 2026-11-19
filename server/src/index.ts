import './types'
import express from 'express'
import cors from 'cors'
import { env } from './config'
import { authRouter } from './routes/auth.routes'
import { formsRouter } from './routes/forms.routes'
import { publicRouter } from './routes/public.routes'
import { errorHandler, notFoundHandler } from './middlewares/error'

const app = express()

app.set('trust proxy', true)
app.use(cors())
app.use(express.json({ limit: '256kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/forms', formsRouter)
app.use('/api/f', publicRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`[server] http://127.0.0.1:${env.PORT}`)
})