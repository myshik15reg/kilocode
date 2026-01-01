# Nuxt.js Patterns

## Основные принципы Nuxt.js

Nuxt.js — мощный фреймворк над Vue.js с SSR, SSG и файловой маршрутизацией.

## Project Structure

```
nuxt-app/
├── pages/           # Автоматическая маршрутизация
├── components/      # Vue компоненты
├── layouts/         # Layouts для страниц
├── middleware/      # Route middleware
├── plugins/         # Vue plugins
├── store/          # Vuex/Pinia store
├── assets/          # Uncompiled assets (SCSS, images)
├── static/          # Static files
├── nuxt.config.ts   # Nuxt configuration
└── app.vue          # Main app component (Nuxt 3)
```

## Pages & Routing

### Файловая маршрутизация

```
pages/
├── index.vue           → /
├── about.vue          → /about
├── users/
│   ├── index.vue      → /users
│   ├── [id].vue       → /users/:id
│   └── profile.vue    → /users/profile
└── [...slug].vue      → /* (catch-all)
```

### Dynamic Routes

```vue
<!-- pages/users/[id].vue -->
<template>
  <div>
    <h1>User {{ id }}</h1>
    <p>{{ user.name }}</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id)

const { data: user } = await useFetch(`/api/users/${id.value}`)
</script>
```

## Data Fetching

### useFetch (Nuxt 3)

```vue
<script setup lang="ts">
// Server + Client-side fetch
const { data, pending, error, refresh } = await useFetch('/api/products')

// С параметрами
const { data: user } = await useFetch('/api/user', {
  headers: {
    Authorization: `Bearer ${token.value}`
  },
  query: {
    include: 'profile'
  }
})

// Lazy loading
const { data, pending } = useLazyFetch('/api/slow-endpoint')
</script>

<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>{{ data }}</div>
  </div>
</template>
```

### useAsyncData

```vue
<script setup lang="ts">
const { data: posts } = await useAsyncData('posts', async () => {
  const response = await $fetch('/api/posts')
  return response.posts
})

// С зависимостями
const route = useRoute()
const { data } = await useAsyncData(
  `post-${route.params.id}`,
  () => $fetch(`/api/posts/${route.params.id}`),
  {
    watch: [() => route.params.id]
  }
)
</script>
```

## State Management (Pinia)

```typescript
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    isAuthenticated: false
  }),

  getters: {
    fullName: (state) => {
      return state.user ? `${state.user.firstName} ${state.user.lastName}` : ''
    }
  },

  actions: {
    async login(email: string, password: string) {
      const data = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })

      this.user = data.user
      this.isAuthenticated = true
    },

    logout() {
      this.user = null
      this.isAuthenticated = false
    }
  }
})
```

Использование в компоненте:

```vue
<script setup lang="ts">
import { useUserStore } from '~/stores/user'

const userStore = useUserStore()

const handleLogin = async () => {
  await userStore.login(email.value, password.value)
}
</script>

<template>
  <div>
    <p v-if="userStore.isAuthenticated">
      Welcome, {{ userStore.fullName }}!
    </p>
    <button @click="handleLogin" v-else>
      Login
    </button>
  </div>
</template>
```

## Middleware

### Route Middleware

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const userStore = useUserStore()

  if (!userStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
```

Использование:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>
```

## Layouts

```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <header>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer>
      © 2025 My App
    </footer>
  </div>
</template>
```

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>
```

## Plugins

```typescript
// plugins/api.ts
export default defineNuxtPlugin(() => {
  const api = $fetch.create({
    baseURL: '/api',
    onRequest({ request, options }) {
      const token = useCookie('auth-token')
      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`
        }
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        navigateTo('/login')
      }
    }
  })

  return {
    provide: {
      api
    }
  }
})
```

Использование:

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

const { data } = await $api('/users')
</script>
```

## SEO & Meta Tags

```vue
<script setup lang="ts">
useSeoMeta({
  title: 'My Amazing Site',
  description: 'This is my amazing site.',
  ogTitle: 'My Amazing Site',
  ogDescription: 'This is my amazing site.',
  ogImage: 'https://example.com/image.png',
  twitterCard: 'summary_large_image',
})

// Or dynamically
const product = ref({ name: 'Product 1', description: 'Description' })

useSeoMeta({
  title: () => product.value.name,
  description: () => product.value.description
})
</script>
```

## Environment Variables

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Private (only server-side)
    apiSecret: process.env.API_SECRET,

    // Public (exposed to client)
    public: {
      apiBase: process.env.API_BASE || '/api'
    }
  }
})
```

Использование:

```vue
<script setup lang="ts">
const config = useRuntimeConfig()

// Client-side
const apiBase = config.public.apiBase

// Server-side (only in server routes/middleware)
const apiSecret = config.apiSecret
</script>
```

## Server Routes (API)

```typescript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const users = await prisma.user.findMany()
  return users
})

// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = await prisma.user.findUnique({
    where: { id: Number(id) }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return user
})

// server/api/users.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const user = await prisma.user.create({
    data: body
  })

  return user
})
```

## Testing

```typescript
// __tests__/components/Button.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '~/components/Button.vue'

describe('Button', () => {
  it('renders properly', () => {
    const wrapper = mount(Button, {
      props: { label: 'Click me' }
    })

    expect(wrapper.text()).toContain('Click me')
  })

  it('emits click event', async () => {
    const wrapper = mount(Button)

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

## Performance Optimization

### Lazy Loading Components

```vue
<template>
  <div>
    <!-- Lazy load heavy component -->
    <LazyHeavyComponent />

    <!-- Or using defineAsyncComponent -->
    <AsyncComponent />
  </div>
</template>

<script setup lang="ts">
const AsyncComponent = defineAsyncComponent(() =>
  import('~/components/HeavyComponent.vue')
)
</script>
```

### Image Optimization

```vue
<template>
  <NuxtImg
    src="/images/hero.jpg"
    alt="Hero image"
    width="800"
    height="600"
    loading="lazy"
    format="webp"
  />
</template>
```

## Deployment

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // Static generation
  ssr: false,

  // Or hybrid rendering
  nitro: {
    prerender: {
      routes: ['/sitemap.xml', '/rss.xml']
    }
  }
})
```

## Best Practices

1. **Используй Composition API** для логики
2. **Auto imports** - не импортируй Vue компоненты и composables вручную
3. **useFetch вместо axios** - встроенная оптимизация
4. **Server routes** для API вместо отдельного backend
5. **Pinia** для state management (не Vuex)
6. **TypeScript** для type safety
7. **SEO** - используй useSeoMeta для каждой страницы

## Ресурсы

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Nuxt Modules](https://nuxt.com/modules)
- [Nuxt Examples](https://nuxt.com/docs/examples)

---

**Последнее обновление:** 2025-12-30
**Версия:** 1.0
