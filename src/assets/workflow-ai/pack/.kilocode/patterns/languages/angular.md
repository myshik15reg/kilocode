# Angular Patterns & Standards

## Project Structure
```
project/
├── angular.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── index.html
│   ├── styles.scss
│   ├── app/
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── app.component.ts
│   │   ├── core/                    # Singleton services
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── api.service.ts
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   └── models/
│   │   ├── shared/                  # Shared components
│   │   │   ├── components/
│   │   │   ├── directives/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   └── features/                # Feature modules
│   │       └── users/
│   │           ├── users.routes.ts
│   │           ├── components/
│   │           ├── services/
│   │           └── models/
│   ├── assets/
│   └── environments/
├── tests/
└── e2e/
```

## Standalone Components (Angular 17+)
```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar />
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    main {
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class AppComponent {}
```

## Signals (Angular 17+)
```typescript
import { Component, signal, computed, effect, input, output } from '@angular/core';
import type { User } from '@/core/models/user.model';

@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `
    <div class="user-card">
      <h2>{{ fullName() }}</h2>
      <p>{{ user().email }}</p>
      <span class="badge" [class.active]="user().isActive">
        {{ user().isActive ? 'Active' : 'Inactive' }}
      </span>

      @if (isEditable()) {
        <button (click)="onEdit()">Edit</button>
      }

      <div class="counter">
        <button (click)="decrement()">-</button>
        <span>{{ count() }}</span>
        <button (click)="increment()">+</button>
      </div>
    </div>
  `
})
export class UserCardComponent {
  // Input signals (Angular 17.1+)
  user = input.required<User>();
  isEditable = input(false);

  // Output
  edit = output<User>();

  // Internal signals
  count = signal(0);

  // Computed signals
  fullName = computed(() => {
    const u = this.user();
    return `${u.firstName} ${u.lastName}`;
  });

  // Effect for side effects
  constructor() {
    effect(() => {
      console.log(`User changed: ${this.user().id}`);
    });
  }

  increment() {
    this.count.update(c => c + 1);
  }

  decrement() {
    this.count.update(c => c - 1);
  }

  onEdit() {
    this.edit.emit(this.user());
  }
}
```

## Services with Signals
```typescript
// services/user.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import type { User } from '@/core/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = '/api/users';

  // State as signals
  private readonly _users = signal<User[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly activeUsers = computed(() =>
    this._users().filter(u => u.isActive)
  );

  readonly userCount = computed(() => this._users().length);

  constructor(private http: HttpClient) {}

  loadUsers(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http.get<User[]>(this.baseUrl).subscribe({
      next: (users) => {
        this._users.set(users);
        this._loading.set(false);
      },
      error: (err) => {
        this._error.set(err.message);
        this._loading.set(false);
      }
    });
  }

  createUser(userData: Omit<User, 'id'>): void {
    this.http.post<User>(this.baseUrl, userData).subscribe({
      next: (user) => {
        this._users.update(users => [...users, user]);
      }
    });
  }

  updateUser(id: number, changes: Partial<User>): void {
    this.http.patch<User>(`${this.baseUrl}/${id}`, changes).subscribe({
      next: (updated) => {
        this._users.update(users =>
          users.map(u => u.id === id ? updated : u)
        );
      }
    });
  }

  deleteUser(id: number): void {
    this.http.delete(`${this.baseUrl}/${id}`).subscribe({
      next: () => {
        this._users.update(users => users.filter(u => u.id !== id));
      }
    });
  }
}
```

## Routes Configuration
```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadChildren: () => import('./features/users/users.routes')
      .then(m => m.USERS_ROUTES)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component')
      .then(m => m.NotFoundComponent)
  }
];

// features/users/users.routes.ts
export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list.component')
      .then(m => m.UserListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./user-detail/user-detail.component')
      .then(m => m.UserDetailComponent)
  }
];
```

## HTTP Interceptor
```typescript
// core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};

// core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/login']);
      }

      console.error('HTTP Error:', error);
      return throwError(() => error);
    })
  );
};

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
  ]
};
```

## Forms
```typescript
// Reactive forms with signals
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="field">
        <label for="name">Name</label>
        <input id="name" formControlName="name" />
        @if (form.controls.name.errors?.['required'] && form.controls.name.touched) {
          <span class="error">Name is required</span>
        }
      </div>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" formControlName="email" />
        @if (form.controls.email.errors?.['email'] && form.controls.email.touched) {
          <span class="error">Invalid email</span>
        }
      </div>

      <button type="submit" [disabled]="!form.valid || loading()">
        {{ loading() ? 'Saving...' : 'Save' }}
      </button>
    </form>
  `
})
export class UserFormComponent {
  loading = signal(false);

  form = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    age: [null as number | null, [Validators.min(0), Validators.max(150)]],
  });

  // Convert form status to signal
  formValid = toSignal(this.form.statusChanges);

  onSubmit() {
    if (this.form.valid) {
      this.loading.set(true);
      const value = this.form.getRawValue();
      // Submit logic...
    }
  }
}
```

## Testing
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { UserListComponent } from './user-list.component';

// Service test
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load users', () => {
    const mockUsers = [{ id: 1, name: 'John' }];

    service.loadUsers();

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);

    expect(service.users()).toEqual(mockUsers);
    expect(service.loading()).toBeFalse();
  });
});

// Component test
describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render users', () => {
    const userElements = fixture.nativeElement.querySelectorAll('.user-item');
    expect(userElements.length).toBe(2);
  });
});
```

## Checklist
- [ ] Standalone components
- [ ] Signals for state
- [ ] input()/output() signal syntax
- [ ] Lazy-loaded routes
- [ ] Functional interceptors
- [ ] OnPush change detection
- [ ] TypeScript strict mode
- [ ] Unit tests with Jest
- [ ] E2E tests with Playwright
