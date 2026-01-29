# TypeScript Patterns & Standards

## tsconfig.json (Strict)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    // Strict checks
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,

    // Module interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Output
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",

    // Skip
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Type Utilities
```typescript
// Make all properties required and non-nullable
type RequiredNonNullable<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Pick with rename
type PickRename<T, K extends keyof T, N extends string> = {
  [P in N]: T[K];
} & Omit<T, K>;

// Nullable
type Nullable<T> = T | null;

// Extract array element type
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

// Function parameter types
type FirstParameter<T extends (...args: any[]) => any> = Parameters<T>[0];

// Awaited return type
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;
```

## Discriminated Unions
```typescript
// State machine with discriminated unions
type LoadingState = { status: 'loading' };
type SuccessState<T> = { status: 'success'; data: T };
type ErrorState = { status: 'error'; error: Error };

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

// Type-safe handling
function handleState<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Data: ${JSON.stringify(state.data)}`;
    case 'error':
      return `Error: ${state.error.message}`;
  }
}

// Exhaustive check
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// API Response pattern
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function handleResponse<T>(response: ApiResponse<T>): T {
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error.message);
}
```

## Branded Types
```typescript
// Branded types for type safety
declare const brand: unique symbol;

type Brand<T, B> = T & { [brand]: B };

// Usage
type UserId = Brand<number, 'UserId'>;
type OrderId = Brand<number, 'OrderId'>;

// Cannot mix up IDs
function getUser(id: UserId): Promise<User> {
  return fetch(`/users/${id}`).then(r => r.json());
}

// Validation function creates branded type
function createUserId(id: number): UserId {
  if (id <= 0) throw new Error('Invalid user ID');
  return id as UserId;
}

// Email brand
type Email = Brand<string, 'Email'>;

function validateEmail(value: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new Error('Invalid email');
  }
  return value as Email;
}
```

## Builder Pattern with Generics
```typescript
class QueryBuilder<T extends object, Selected extends keyof T = never> {
  private selectFields: (keyof T)[] = [];
  private whereConditions: Partial<T> = {};
  private orderByField?: keyof T;

  select<K extends keyof T>(
    ...fields: K[]
  ): QueryBuilder<T, Selected | K> {
    this.selectFields.push(...fields);
    return this as QueryBuilder<T, Selected | K>;
  }

  where(conditions: Partial<T>): this {
    this.whereConditions = { ...this.whereConditions, ...conditions };
    return this;
  }

  orderBy(field: keyof T): this {
    this.orderByField = field;
    return this;
  }

  build(): { select: (keyof T)[]; where: Partial<T>; orderBy?: keyof T } {
    return {
      select: this.selectFields,
      where: this.whereConditions,
      orderBy: this.orderByField,
    };
  }
}

// Usage - type-safe field selection
interface User {
  id: number;
  name: string;
  email: string;
}

const query = new QueryBuilder<User>()
  .select('id', 'name')
  .where({ name: 'John' })
  .orderBy('id')
  .build();
```

## Type Guards
```typescript
// User-defined type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as User).id === 'number' &&
    typeof (value as User).name === 'string'
  );
}

// Assertion function
function assertIsUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error('Value is not a User');
  }
}

// Array filtering with type guard
function filterUsers(items: unknown[]): User[] {
  return items.filter(isUser);
}

// Narrowing with in operator
function processResponse(response: SuccessResponse | ErrorResponse) {
  if ('data' in response) {
    // TypeScript knows this is SuccessResponse
    console.log(response.data);
  } else {
    // TypeScript knows this is ErrorResponse
    console.log(response.error);
  }
}
```

## Generic Constraints
```typescript
// Constrain to object with specific shape
function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}

// Constrain to have specific method
interface HasId {
  id: number;
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}

// Conditional types
type TypeName<T> =
  T extends string ? 'string' :
  T extends number ? 'number' :
  T extends boolean ? 'boolean' :
  T extends undefined ? 'undefined' :
  T extends Function ? 'function' :
  'object';

// Infer in conditional types
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type ReturnTypeOfPromise<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;
```

## Result Type Pattern
```typescript
// Result type for error handling without exceptions
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper functions
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Usage
function parseJSON<T>(json: string): Result<T, SyntaxError> {
  try {
    return ok(JSON.parse(json) as T);
  } catch (e) {
    return err(e as SyntaxError);
  }
}

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

// Chaining
function chain<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
}
```

## Mapped Types
```typescript
// Make all properties optional and nullable
type Partial<T> = { [P in keyof T]?: T[P] };

// Make all properties required
type Required<T> = { [P in keyof T]-?: T[P] };

// Make all properties readonly
type Readonly<T> = { readonly [P in keyof T]: T[P] };

// Create getters for all properties
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// Remove readonly from all properties
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

// Pick properties by value type
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

// Usage
interface User {
  id: number;
  name: string;
  isActive: boolean;
}

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getIsActive: () => boolean }

type StringPropsOfUser = PickByType<User, string>;
// { name: string }
```

## Checklist
- [ ] `strict: true` in tsconfig
- [ ] `noUncheckedIndexedAccess: true`
- [ ] Avoid `any`, use `unknown`
- [ ] Use discriminated unions
- [ ] Branded types for IDs
- [ ] Type guards for runtime checks
- [ ] Result type for error handling
- [ ] Exhaustive switch checks
- [ ] Generic constraints properly used
