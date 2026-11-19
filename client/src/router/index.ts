import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api/http'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { blank: true, guestOnly: true },
    },
    { path: '/', redirect: '/forms' },
    {
      path: '/forms',
      name: 'forms',
      component: () => import('@/views/FormsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/forms/:id/design',
      name: 'design',
      component: () => import('@/views/DesignerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/forms/:id/records',
      name: 'records',
      component: () => import('@/views/RecordsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/f/:shareId',
      name: 'fill',
      component: () => import('@/views/FillView.vue'),
      meta: { blank: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/forms' },
  ],
})

router.beforeEach((to) => {
  const token = getToken()
  if (to.meta.requiresAuth && !token) return { name: 'login' }
  if (to.meta.guestOnly && token) return { name: 'forms' }
  return true
})

export default router