# Vue.js Patterns & Standards

## Project Structure
```
project/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── assets/
│   │   ├── styles/
│   │   └── images/
│   ├── components/
│   │   ├── common/           # Shared components
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseInput.vue
│   │   │   └── BaseModal.vue
│   │   └── features/         # Feature-specific
│   │       └── users/
│   ├── views/                # Page components
│   │   ├── HomeView.vue
│   │   └── UsersView.vue
│   ├── composables/          # Reusable logic
│   │   ├── useAuth.ts
│   │   └── useFetch.ts
│   ├── stores/               # Pinia stores
│   │   ├── index.ts
│   │   └── userStore.ts
│   ├── services/             # API calls
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── router/
│       └── index.ts
├── tests/
│   ├── unit/
│   └── e2e/
└── env.d.ts
```

## Component Template (Script Setup)
```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { User } from '@/types';

// Props with types and defaults
interface Props {
  user: User;
  isEditable?: boolean;
  maxLength?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isEditable: false,
  maxLength: 100,
});

// Emits with types
interface Emits {
  (e: 'update', user: User): void;
  (e: 'delete', id: number): void;
}

const emit = defineEmits<Emits>();

// Refs
const isLoading = ref(false);
const inputValue = ref('');

// Computed
const displayName = computed(() => {
  return `${props.user.firstName} ${props.user.lastName}`;
});

// Methods
const handleUpdate = () => {
  emit('update', { ...props.user, name: inputValue.value });
};

// Watchers
watch(
  () => props.user,
  (newUser) => {
    inputValue.value = newUser.name;
  },
  { immediate: true }
);

// Lifecycle
onMounted(() => {
  console.log('Component mounted');
});

// Expose for parent access (use sparingly)
defineExpose({
  inputValue,
});
</script>

<template>
  <div class="user-card">
    <h2>{{ displayName }}</h2>
    <input
      v-if="isEditable"
      v-model="inputValue"
      :maxlength="maxLength"
      @keyup.enter="handleUpdate"
    />
    <button @click="handleUpdate" :disabled="isLoading">
      {{ isLoading ? 'Saving...' : 'Save' }}
    </button>
  </div>
</template>

<style scoped>
.user-card {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
</style>
```

## Composables
```typescript
// composables/useFetch.ts
import { ref, shallowRef, type Ref } from 'vue';

interface UseFetchOptions<T> {
  immediate?: boolean;
  initialData?: T;
}

interface UseFetchReturn<T> {
  data: Ref<T | null>;
  error: Ref<Error | null>;
  isLoading: Ref<boolean>;
  execute: () => Promise<void>;
}

export function useFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { immediate = true, initialData = null } = options;

  const data = shallowRef<T | null>(initialData);
  const error = ref<Error | null>(null);
  const isLoading = ref(false);

  const execute = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const resolvedUrl = typeof url === 'function' ? url() : url;
      const response = await fetch(resolvedUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      data.value = await response.json();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      isLoading.value = false;
    }
  };

  if (immediate) {
    execute();
  }

  return { data, error, isLoading, execute };
}

// composables/useAuth.ts
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';

export function useAuth() {
  const userStore = useUserStore();

  const isAuthenticated = computed(() => !!userStore.currentUser);
  const isAdmin = computed(() => userStore.currentUser?.role === 'admin');

  const login = async (email: string, password: string) => {
    await userStore.login(email, password);
  };

  const logout = async () => {
    await userStore.logout();
  };

  return {
    isAuthenticated,
    isAdmin,
    currentUser: computed(() => userStore.currentUser),
    login,
    logout,
  };
}
```

## Pinia Store
```typescript
// stores/userStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';
import { api } from '@/services/api';

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<User[]>([]);
  const currentUser = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const activeUsers = computed(() =>
    users.value.filter((u) => u.isActive)
  );

  const userById = computed(() => (id: number) =>
    users.value.find((u) => u.id === id)
  );

  // Actions
  const fetchUsers = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      users.value = await api.get<User[]>('/users');
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch users';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const createUser = async (userData: Omit<User, 'id'>) => {
    const newUser = await api.post<User>('/users', userData);
    users.value.push(newUser);
    return newUser;
  };

  const updateUser = async (id: number, userData: Partial<User>) => {
    const updatedUser = await api.patch<User>(`/users/${id}`, userData);
    const index = users.value.findIndex((u) => u.id === id);
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
    return updatedUser;
  };

  const deleteUser = async (id: number) => {
    await api.delete(`/users/${id}`);
    users.value = users.value.filter((u) => u.id !== id);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<{ user: User; token: string }>(
      '/auth/login',
      { email, password }
    );
    currentUser.value = response.user;
    localStorage.setItem('token', response.token);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    currentUser.value = null;
    localStorage.removeItem('token');
  };

  return {
    // State
    users,
    currentUser,
    isLoading,
    error,
    // Getters
    activeUsers,
    userById,
    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    login,
    logout,
  };
});
```

## Router Configuration
```typescript
// router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/userStore';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users/:id',
    name: 'user-detail',
    component: () => import('@/views/UserDetailView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guards
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = !!userStore.currentUser;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;
```

## Testing
```typescript
// tests/unit/UserCard.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserCard from '@/components/UserCard.vue';

describe('UserCard', () => {
  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  it('renders user name', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser },
    });

    expect(wrapper.text()).toContain('John Doe');
  });

  it('emits update event when button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser, isEditable: true },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('update')).toBeTruthy();
    expect(wrapper.emitted('update')?.[0]).toEqual([
      expect.objectContaining({ id: 1 }),
    ]);
  });

  it('shows input when editable', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser, isEditable: true },
    });

    expect(wrapper.find('input').exists()).toBe(true);
  });
});

// Testing composables
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '@/stores/userStore';

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('fetches users', async () => {
    const store = useUserStore();
    vi.spyOn(api, 'get').mockResolvedValue([mockUser]);

    await store.fetchUsers();

    expect(store.users).toHaveLength(1);
    expect(store.users[0].id).toBe(1);
  });
});
```

## Checklist
- [ ] `<script setup>` syntax
- [ ] TypeScript with strict mode
- [ ] Props with types and defaults
- [ ] Typed emit declarations
- [ ] Composables for reusable logic
- [ ] Pinia for state management
- [ ] Lazy-loaded routes
- [ ] Navigation guards
- [ ] Unit tests with Vitest
- [ ] E2E tests with Playwright
