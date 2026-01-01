# C# Patterns & Standards

## Project Structure (Clean Architecture)
```
Solution/
├── src/
│   ├── Domain/                    # Enterprise business rules
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   ├── Enums/
│   │   ├── Events/
│   │   └── Exceptions/
│   ├── Application/               # Application business rules
│   │   ├── Common/
│   │   │   ├── Behaviors/
│   │   │   ├── Interfaces/
│   │   │   └── Models/
│   │   ├── Features/
│   │   │   └── Users/
│   │   │       ├── Commands/
│   │   │       ├── Queries/
│   │   │       └── EventHandlers/
│   │   └── DependencyInjection.cs
│   ├── Infrastructure/            # External concerns
│   │   ├── Persistence/
│   │   ├── Services/
│   │   └── DependencyInjection.cs
│   └── WebApi/                    # Presentation
│       ├── Controllers/
│       ├── Filters/
│       ├── Middleware/
│       └── Program.cs
├── tests/
│   ├── Domain.UnitTests/
│   ├── Application.UnitTests/
│   └── WebApi.IntegrationTests/
└── Solution.sln
```

## Naming Conventions
```csharp
// Classes, Records, Structs: PascalCase
public class UserService { }
public record UserDto(string Name, string Email);
public struct Point { }

// Interfaces: IPascalCase
public interface IUserRepository { }
public interface IEmailService { }

// Methods, Properties: PascalCase
public string FirstName { get; set; }
public async Task<User> GetByIdAsync(int id) { }

// Private fields: _camelCase
private readonly IUserRepository _userRepository;
private string _connectionString;

// Parameters, locals: camelCase
public void Process(string userName, int maxRetries) { }

// Constants: PascalCase
public const int MaxRetryCount = 3;

// Async methods: suffix with Async
public async Task<User> GetUserAsync(int id) { }
```

## Nullable Reference Types
```csharp
// Enable in .csproj
// <Nullable>enable</Nullable>

public class User
{
    // Non-nullable - must be initialized
    public required string Email { get; init; }

    // Nullable - can be null
    public string? MiddleName { get; set; }

    // Constructor ensures non-null
    public User(string email)
    {
        Email = email ?? throw new ArgumentNullException(nameof(email));
    }
}

// Null checking patterns
public string GetDisplayName(User? user)
{
    // Null-conditional
    return user?.MiddleName ?? user?.Email ?? "Unknown";
}

// Pattern matching
if (user is { Email: var email, MiddleName: not null })
{
    Console.WriteLine($"{email} has middle name");
}
```

## Records & Immutability
```csharp
// Immutable record
public record UserDto(
    int Id,
    string Name,
    string Email,
    DateTime CreatedAt
);

// With mutation (creates new instance)
var updated = user with { Name = "New Name" };

// Record with validation
public record CreateUserCommand
{
    public required string Name { get; init; }
    public required string Email { get; init; }

    public CreateUserCommand()
    {
        // Validation can be added here or via FluentValidation
    }
}

// Value Object pattern
public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return this with { Amount = Amount + other.Amount };
    }
}
```

## Async/Await Patterns
```csharp
// Always use async/await for I/O
public async Task<User> GetUserAsync(int id, CancellationToken ct = default)
{
    return await _context.Users
        .FirstOrDefaultAsync(u => u.Id == id, ct)
        ?? throw new NotFoundException(nameof(User), id);
}

// Parallel execution
public async Task<(User user, IEnumerable<Order> orders)> GetUserWithOrdersAsync(int id)
{
    var userTask = _userRepository.GetByIdAsync(id);
    var ordersTask = _orderRepository.GetByUserIdAsync(id);

    await Task.WhenAll(userTask, ordersTask);

    return (await userTask, await ordersTask);
}

// Cancellation support
public async Task ProcessAsync(CancellationToken ct)
{
    foreach (var item in items)
    {
        ct.ThrowIfCancellationRequested();
        await ProcessItemAsync(item, ct);
    }
}

// ValueTask for hot paths
public ValueTask<int> GetCachedCountAsync()
{
    if (_cache.TryGetValue("count", out int count))
        return ValueTask.FromResult(count);

    return new ValueTask<int>(LoadCountAsync());
}
```

## LINQ Best Practices
```csharp
// Method syntax (preferred for complex queries)
var activeUsers = users
    .Where(u => u.IsActive)
    .OrderBy(u => u.Name)
    .Select(u => new UserDto(u.Id, u.Name, u.Email))
    .ToList();

// Query syntax (for joins)
var query = from u in users
            join o in orders on u.Id equals o.UserId
            where o.Total > 100
            select new { u.Name, o.Total };

// EF Core specific
var users = await _context.Users
    .AsNoTracking()  // Read-only queries
    .Include(u => u.Orders)
    .Where(u => u.IsActive)
    .ToListAsync(ct);

// Avoid N+1
var usersWithOrders = await _context.Users
    .Select(u => new
    {
        User = u,
        OrderCount = u.Orders.Count(),
        TotalSpent = u.Orders.Sum(o => o.Total)
    })
    .ToListAsync(ct);
```

## Dependency Injection
```csharp
// Program.cs (Minimal API)
var builder = WebApplication.CreateBuilder(args);

// Register services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
builder.Services.AddTransient<IEmailService, EmailService>();

// Options pattern
builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection("Email"));

// Service with options
public class EmailService : IEmailService
{
    private readonly EmailOptions _options;

    public EmailService(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }
}
```

## Exception Handling
```csharp
// Custom exceptions
public class DomainException : Exception
{
    public string Code { get; }

    public DomainException(string code, string message) : base(message)
    {
        Code = code;
    }
}

public class NotFoundException : DomainException
{
    public NotFoundException(string entity, object key)
        : base("NOT_FOUND", $"{entity} with key {key} was not found")
    { }
}

// Global exception handler middleware
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (NotFoundException ex)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new { error = "Internal server error" });
        }
    }
}
```

## Testing
```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _repositoryMock;
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _repositoryMock = new Mock<IUserRepository>();
        _sut = new UserService(_repositoryMock.Object);
    }

    [Fact]
    public async Task GetByIdAsync_ExistingUser_ReturnsUser()
    {
        // Arrange
        var user = new User { Id = 1, Name = "John" };
        _repositoryMock.Setup(r => r.GetByIdAsync(1, default))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("John");
    }

    [Theory]
    [InlineData("", false)]
    [InlineData("test@example.com", true)]
    [InlineData("invalid", false)]
    public void IsValidEmail_VariousInputs_ReturnsExpected(string email, bool expected)
    {
        var result = EmailValidator.IsValid(email);
        result.Should().Be(expected);
    }
}

// Integration tests with WebApplicationFactory
public class UsersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UsersControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_ReturnsSuccess()
    {
        var response = await _client.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
    }
}
```

## Checklist
- [ ] Nullable reference types enabled
- [ ] Records for DTOs and value objects
- [ ] async/await for all I/O
- [ ] CancellationToken propagation
- [ ] IDisposable/IAsyncDisposable implemented
- [ ] Constructor injection
- [ ] Global exception handling
- [ ] Unit tests with xUnit + Moq + FluentAssertions
