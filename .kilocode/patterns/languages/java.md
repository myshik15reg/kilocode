# Java Patterns & Standards

## Project Structure (Maven/Gradle)
```
project/
├── pom.xml / build.gradle
├── src/
│   ├── main/
│   │   ├── java/com/example/project/
│   │   │   ├── Application.java
│   │   │   ├── config/
│   │   │   │   └── AppConfig.java
│   │   │   ├── domain/
│   │   │   │   ├── entity/
│   │   │   │   ├── repository/
│   │   │   │   └── service/
│   │   │   ├── application/
│   │   │   │   ├── dto/
│   │   │   │   └── usecase/
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   └── external/
│   │   │   └── presentation/
│   │   │       ├── controller/
│   │   │       └── advice/
│   │   └── resources/
│   │       ├── application.yml
│   │       └── db/migration/
│   └── test/
│       └── java/com/example/project/
└── docker-compose.yml
```

## Naming Conventions
```java
// Classes: PascalCase, nouns
public class UserService {}
public class OrderRepository {}
public class PaymentController {}

// Interfaces: PascalCase, adjectives or capabilities
public interface Serializable {}
public interface UserRepository {}

// Methods: camelCase, verbs
public User findById(Long id) {}
public void processPayment() {}
public boolean isValid() {}

// Constants: UPPER_SNAKE_CASE
public static final int MAX_RETRY_COUNT = 3;
public static final String DEFAULT_CHARSET = "UTF-8";

// Packages: lowercase, reverse domain
package com.example.project.domain.entity;
```

## Immutable Objects
```java
// Using Records (Java 17+)
public record UserDto(
    Long id,
    String name,
    String email,
    LocalDateTime createdAt
) {
    // Compact constructor for validation
    public UserDto {
        Objects.requireNonNull(name, "name must not be null");
        Objects.requireNonNull(email, "email must not be null");
    }
}

// Traditional immutable class
public final class User {
    private final Long id;
    private final String name;
    private final List<String> roles;

    public User(Long id, String name, List<String> roles) {
        this.id = id;
        this.name = Objects.requireNonNull(name);
        this.roles = List.copyOf(roles); // Defensive copy
    }

    public List<String> getRoles() {
        return roles; // Already immutable
    }
}
```

## Optional Usage
```java
// GOOD: Return Optional for potentially absent values
public Optional<User> findById(Long id) {
    return Optional.ofNullable(userMap.get(id));
}

// GOOD: Chain Optional operations
public String getUserEmail(Long id) {
    return findById(id)
        .map(User::getEmail)
        .orElse("unknown@example.com");
}

// BAD: Don't use Optional as field or parameter
// private Optional<String> middleName; // DON'T
// public void process(Optional<Config> config) // DON'T

// GOOD: Use null for optional parameters, document with @Nullable
public void process(@Nullable Config config) {
    Config effectiveConfig = config != null ? config : Config.defaults();
}
```

## Stream API
```java
// Filter, map, collect
List<String> activeUserNames = users.stream()
    .filter(User::isActive)
    .map(User::getName)
    .sorted()
    .collect(Collectors.toList());

// Grouping
Map<Department, List<Employee>> byDepartment = employees.stream()
    .collect(Collectors.groupingBy(Employee::getDepartment));

// Reduce
int totalSalary = employees.stream()
    .mapToInt(Employee::getSalary)
    .sum();

// Parallel (only for large datasets)
long count = largeList.parallelStream()
    .filter(this::expensiveCheck)
    .count();
```

## Exception Handling
```java
// Custom exception hierarchy
public class DomainException extends RuntimeException {
    private final ErrorCode code;

    public DomainException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }
}

public class EntityNotFoundException extends DomainException {
    public EntityNotFoundException(String entity, Object id) {
        super(ErrorCode.NOT_FOUND,
              String.format("%s with id %s not found", entity, id));
    }
}

// Global exception handler (Spring)
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(ErrorCode.INTERNAL, "Internal server error"));
    }
}
```

## Dependency Injection
```java
// Constructor injection (preferred)
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;

    // @Autowired not needed with single constructor
    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
}

// Configuration class
@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
}
```

## Testing
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void findById_existingUser_returnsUser() {
        // Arrange
        var user = new User(1L, "John");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // Act
        var result = userService.findById(1L);

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("John");
        verify(userRepository).findById(1L);
    }

    @Test
    void findById_nonExistingUser_throwsException() {
        // Arrange
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> userService.getById(999L))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessageContaining("999");
    }
}

// Integration test
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void save_validUser_persistsSuccessfully() {
        var user = new User(null, "Test User");
        var saved = userRepository.save(user);

        assertThat(saved.getId()).isNotNull();
    }
}
```

## Checklist
- [ ] Immutable objects where possible
- [ ] Optional for return types, not fields/params
- [ ] Constructor injection
- [ ] Proper exception hierarchy
- [ ] Stream API for collections
- [ ] Unit tests with Mockito
- [ ] Integration tests with Testcontainers
