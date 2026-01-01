# Node.js Patterns & Standards

## Project Structure
```
project/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express/Fastify app
│   ├── config/
│   │   ├── index.ts
│   │   └── database.ts
│   ├── domain/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── services/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── cache/
│   │   └── queue/
│   ├── api/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── validators/
│   ├── utils/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
└── docker/
```

## tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Error Handling
```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string | number) {
    super('NOT_FOUND', `${entity} with id ${id} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: Record<string, string[]> = {}
  ) {
    super('VALIDATION_ERROR', message, 400);
  }
}

// Express error middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
      },
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
};

// Async wrapper
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

## Dependency Injection
```typescript
// Using tsyringe
import { container, injectable, inject } from 'tsyringe';

@injectable()
export class UserService {
  constructor(
    @inject('UserRepository') private userRepository: IUserRepository,
    @inject('EmailService') private emailService: IEmailService
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const user = await this.userRepository.create(data);
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}

// Registration
container.register('UserRepository', { useClass: PostgresUserRepository });
container.register('EmailService', { useClass: SendGridEmailService });

// Usage
const userService = container.resolve(UserService);
```

## Validation with Zod
```typescript
import { z } from 'zod';

// Schema definition
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  roles: z.array(z.enum(['admin', 'user', 'moderator'])).default(['user']),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

// Validation middleware
export const validate = <T extends z.ZodSchema>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', formatZodErrors(result.error));
    }
    req.body = result.data;
    next();
  };
};

// Route usage
router.post('/users', validate(createUserSchema), userController.create);
```

## Database Patterns (Prisma)
```typescript
// prisma/schema.prisma
// model User {
//   id        Int      @id @default(autoincrement())
//   email     String   @unique
//   name      String
//   createdAt DateTime @default(now())
//   orders    Order[]
// }

// Repository pattern
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { orders: true },
    });
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
      },
    });
  }

  async findMany(filter: UserFilter): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        ...(filter.name && { name: { contains: filter.name } }),
        ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      },
      orderBy: { createdAt: 'desc' },
      skip: filter.offset,
      take: filter.limit,
    });
  }
}

// Transaction
async function transferFunds(fromId: number, toId: number, amount: number) {
  return prisma.$transaction(async (tx) => {
    const from = await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    if (from.balance < 0) {
      throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient funds', 400);
    }

    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    return { success: true };
  });
}
```

## Testing
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test
describe('UserService', () => {
  let userService: UserService;
  let mockRepository: MockedObject<IUserRepository>;
  let mockEmailService: MockedObject<IEmailService>;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
    };
    mockEmailService = {
      sendWelcome: vi.fn(),
    };
    userService = new UserService(mockRepository, mockEmailService);
  });

  it('should create user and send welcome email', async () => {
    // Arrange
    const userData = { name: 'John', email: 'john@example.com' };
    const expectedUser = { id: 1, ...userData };
    mockRepository.create.mockResolvedValue(expectedUser);
    mockEmailService.sendWelcome.mockResolvedValue(undefined);

    // Act
    const result = await userService.createUser(userData);

    // Assert
    expect(result).toEqual(expectedUser);
    expect(mockRepository.create).toHaveBeenCalledWith(userData);
    expect(mockEmailService.sendWelcome).toHaveBeenCalledWith(userData.email);
  });
});

// Integration test
describe('POST /api/users', () => {
  it('should create user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'John',
      email: 'john@example.com',
    });
  });
});
```

## Graceful Shutdown
```typescript
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP server closed');

    // Close database connections
    await prisma.$disconnect();
    console.log('Database disconnected');

    // Close Redis connection
    await redis.quit();
    console.log('Redis disconnected');

    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## Checklist
- [ ] TypeScript strict mode
- [ ] ESLint + Prettier configured
- [ ] Zod for validation
- [ ] Custom error hierarchy
- [ ] Async error handling
- [ ] Graceful shutdown
- [ ] Health check endpoint
- [ ] Structured logging (pino)
- [ ] Unit & integration tests
- [ ] Environment validation
