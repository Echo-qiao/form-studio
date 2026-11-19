import { request } from './http'
import type { FormSchema } from '@/lib/schema'

export type UserInfo = { id: string; email: string; name: string }

export type FormSummary = {
  id: string
  title: string
  status: 'draft' | 'published' | 'closed'
  version: number
  shareId: string
  submissions: number
  updatedAt: string
}

export type FormDetail = {
  id: string
  title: string
  status: 'draft' | 'published' | 'closed'
  version: number
  shareId: string
  schema: FormSchema
  updatedAt: string
}

export type SubmissionRow = {
  id: string
  formVersion: number
  createdAt: string
  data: Record<string, unknown>
  schema: FormSchema
}

export function register(email: string, password: string, name: string) {
  return request<{ token: string; user: UserInfo }>('/api/auth/register', {
    method: 'POST',
    body: { email, password, name },
  })
}

export function login(email: string, password: string) {
  return request<{ token: string; user: UserInfo }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function fetchMe() {
  return request<UserInfo>('/api/auth/me')
}

export function listForms() {
  return request<FormSummary[]>('/api/forms')
}

export function createForm(title: string) {
  return request<{ id: string; title: string; version: number; status: string; shareId: string }>('/api/forms', {
    method: 'POST',
    body: { title },
  })
}

export function getForm(id: string) {
  return request<FormDetail>(`/api/forms/${id}`)
}

export function saveForm(id: string, schema: FormSchema) {
  return request<{ id: string; title: string; version: number }>(`/api/forms/${id}`, {
    method: 'PUT',
    body: { title: schema.title, schema },
  })
}

export function setFormStatus(id: string, status: 'draft' | 'published' | 'closed') {
  return request<{ ok: boolean; status: string }>(`/api/forms/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export function listSubmissions(formId: string) {
  return request<{ currentVersion: number; list: SubmissionRow[] }>(`/api/forms/${formId}/submissions`)
}

export function getPublicForm(shareId: string) {
  return request<{ title: string; version: number; schema: FormSchema }>(`/api/f/${shareId}`)
}

export function submitForm(shareId: string, data: Record<string, unknown>) {
  return request<{ ok: boolean; id: string }>(`/api/f/${shareId}/submit`, {
    method: 'POST',
    body: { data },
  })
}