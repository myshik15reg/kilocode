# React Patterns & Standards

## Project Structure
```
project/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── assets/
│   ├── components/
│   │   ├── ui/               # Generic UI components
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   └── Input/
│   │   └── features/         # Feature-specific components
│   │       └── users/
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.ts
│   │   └── useFetch.ts
│   ├── pages/                # Route pages
│   │   ├── Home.tsx
│   │   └── Users.tsx
│   ├── services/             # API layer
│   │   └── api.ts
│   ├── stores/               # State management
│   │   └── userStore.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── tests/
│   ├── setup.ts
│   └── mocks/
└── e2e/
```

## Component Template
```tsx
import { memo, useState, useCallback } from 'react';
import type { FC, ReactNode } from 'react';

interface UserCardProps {
  user: User;
  isEditable?: boolean;
  onUpdate?: (user: User) => void;
  children?: ReactNode;
}

export const UserCard: FC<UserCardProps> = memo(({
  user,
  isEditable = false,
  onUpdate,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = useCallback(async () => {
    if (!onUpdate) return;

    setIsLoading(true);
    try {
      await onUpdate(user);
    } finally {
      setIsLoading(false);
    }
  }, [user, onUpdate]);

  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>

      {isEditable && (
        <button onClick={handleUpdate} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      )}

      {children}
    </div>
  );
});

UserCard.displayName = 'UserCard';
```

## Custom Hooks
```tsx
// hooks/useFetch.ts
import { useState, useEffect, useCallback } from 'react';

interface UseFetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseFetchReturn<T> extends UseFetchState<T> {
  refetch: () => Promise<void>;
}

export function useFetch<T>(url: string): UseFetchReturn<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// hooks/useLocalStorage.ts
import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, [key]);

  return [storedValue, setValue];
}
```

## State Management (Zustand)
```tsx
// stores/userStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: number, data: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        users: [],
        currentUser: null,
        isLoading: false,
        error: null,

        fetchUsers: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch('/api/users');
            const users = await response.json();
            set({ users, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch',
              isLoading: false,
            });
          }
        },

        addUser: async (userData) => {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          });
          const user = await response.json();
          set(state => ({ users: [...state.users, user] }));
        },

        updateUser: async (id, data) => {
          const response = await fetch(`/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const updated = await response.json();
          set(state => ({
            users: state.users.map(u => u.id === id ? updated : u),
          }));
        },

        deleteUser: async (id) => {
          await fetch(`/api/users/${id}`, { method: 'DELETE' });
          set(state => ({
            users: state.users.filter(u => u.id !== id),
          }));
        },

        setCurrentUser: (user) => set({ currentUser: user }),
      }),
      { name: 'user-store' }
    )
  )
);

// Selectors
export const useActiveUsers = () =>
  useUserStore(state => state.users.filter(u => u.isActive));

export const useUserById = (id: number) =>
  useUserStore(state => state.users.find(u => u.id === id));
```

## Data Fetching (React Query)
```tsx
// services/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// Queries
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => api.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.getUser(id),
    enabled: id > 0,
  });
}

// Mutations
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
      api.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Usage in component
function UserList() {
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {users?.map(user => <UserCard key={user.id} user={user} />)}
      <button
        onClick={() => createUser.mutate({ name: 'New User' })}
        disabled={createUser.isPending}
      >
        Add User
      </button>
    </div>
  );
}
```

## Error Boundary
```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

## Testing
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

describe('UserCard', () => {
  const mockUser: User = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('renders user information', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onUpdate when button clicked', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(<UserCard user={mockUser} isEditable onUpdate={onUpdate} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onUpdate).toHaveBeenCalledWith(mockUser);
  });

  it('disables button while loading', async () => {
    const onUpdate = vi.fn(() => new Promise(r => setTimeout(r, 100)));

    render(<UserCard user={mockUser} isEditable onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});

// Testing hooks
import { renderHook, waitFor } from '@testing-library/react';

describe('useFetch', () => {
  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });
});
```

## Checklist
- [ ] Functional components only
- [ ] TypeScript with strict mode
- [ ] Custom hooks for reusable logic
- [ ] Memoization where needed
- [ ] Error boundaries
- [ ] React Query for server state
- [ ] Zustand/Jotai for client state
- [ ] Testing Library tests
- [ ] Accessibility (a11y)
