# Kotlin Patterns & Standards

## Project Structure
```
project/
├── build.gradle.kts
├── settings.gradle.kts
├── src/
│   ├── main/
│   │   ├── kotlin/com/example/project/
│   │   │   ├── Application.kt
│   │   │   ├── config/
│   │   │   │   └── AppConfig.kt
│   │   │   ├── domain/
│   │   │   │   ├── model/
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
│   │   │       └── handler/
│   │   └── resources/
│   │       └── application.yml
│   └── test/
│       └── kotlin/com/example/project/
└── docker-compose.yml
```

## Data Classes & Immutability
```kotlin
// Immutable data class
data class User(
    val id: Long,
    val name: String,
    val email: String,
    val roles: List<String> = emptyList(),
    val createdAt: Instant = Instant.now()
)

// Copy with modifications
val updatedUser = user.copy(name = "New Name")

// Data class with validation
data class CreateUserRequest(
    val name: String,
    val email: String,
    val age: Int? = null
) {
    init {
        require(name.isNotBlank()) { "Name cannot be blank" }
        require(email.contains("@")) { "Invalid email format" }
        age?.let { require(it in 0..150) { "Age must be between 0 and 150" } }
    }
}

// Value class for type safety
@JvmInline
value class UserId(val value: Long) {
    init {
        require(value > 0) { "UserId must be positive" }
    }
}

@JvmInline
value class Email(val value: String) {
    init {
        require(value.contains("@")) { "Invalid email" }
    }
}
```

## Sealed Classes for State
```kotlin
// Sealed class for states
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}

// Extension functions
inline fun <T, R> Result<T>.map(transform: (T) -> R): Result<R> = when (this) {
    is Result.Success -> Result.Success(transform(data))
    is Result.Error -> this
    is Result.Loading -> this
}

inline fun <T> Result<T>.onSuccess(action: (T) -> Unit): Result<T> {
    if (this is Result.Success) action(data)
    return this
}

inline fun <T> Result<T>.onError(action: (Throwable) -> Unit): Result<T> {
    if (this is Result.Error) action(exception)
    return this
}

// Sealed interface for API responses
sealed interface ApiResponse<out T> {
    data class Success<T>(val data: T) : ApiResponse<T>
    sealed interface Error : ApiResponse<Nothing> {
        data class NotFound(val message: String) : Error
        data class Validation(val errors: Map<String, List<String>>) : Error
        data class ServerError(val cause: Throwable) : Error
    }
}

// Exhaustive when
fun <T> handleResponse(response: ApiResponse<T>): String = when (response) {
    is ApiResponse.Success -> "Data: ${response.data}"
    is ApiResponse.Error.NotFound -> "Not found: ${response.message}"
    is ApiResponse.Error.Validation -> "Validation errors: ${response.errors}"
    is ApiResponse.Error.ServerError -> "Server error: ${response.cause.message}"
}
```

## Coroutines & Flow
```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

// Suspend functions
suspend fun fetchUser(id: Long): User {
    return withContext(Dispatchers.IO) {
        userRepository.findById(id)
            ?: throw NotFoundException("User $id not found")
    }
}

// Parallel execution
suspend fun getUserWithOrders(userId: Long): UserWithOrders = coroutineScope {
    val userDeferred = async { userRepository.findById(userId) }
    val ordersDeferred = async { orderRepository.findByUserId(userId) }

    UserWithOrders(
        user = userDeferred.await() ?: throw NotFoundException("User not found"),
        orders = ordersDeferred.await()
    )
}

// Flow for streams
fun observeUsers(): Flow<List<User>> = flow {
    while (currentCoroutineContext().isActive) {
        emit(userRepository.findAll())
        delay(5000)
    }
}.flowOn(Dispatchers.IO)

// Flow operators
fun searchUsers(query: Flow<String>): Flow<List<User>> = query
    .debounce(300)
    .filter { it.length >= 2 }
    .distinctUntilChanged()
    .flatMapLatest { searchTerm ->
        flow { emit(userRepository.search(searchTerm)) }
    }
    .catch { e -> emit(emptyList()) }
    .flowOn(Dispatchers.IO)

// StateFlow for state management
class UserViewModel(private val repository: UserRepository) {
    private val _users = MutableStateFlow<Result<List<User>>>(Result.Loading)
    val users: StateFlow<Result<List<User>>> = _users.asStateFlow()

    fun loadUsers() {
        viewModelScope.launch {
            _users.value = Result.Loading
            _users.value = try {
                Result.Success(repository.findAll())
            } catch (e: Exception) {
                Result.Error(e)
            }
        }
    }
}
```

## Extension Functions
```kotlin
// String extensions
fun String.toSlug(): String = this
    .lowercase()
    .replace(Regex("[^a-z0-9\\s-]"), "")
    .replace(Regex("\\s+"), "-")
    .trim('-')

fun String?.orEmpty(): String = this ?: ""

fun String?.isNotNullOrBlank(): Boolean = !this.isNullOrBlank()

// Collection extensions
fun <T> List<T>.secondOrNull(): T? = this.getOrNull(1)

inline fun <T> List<T>.indexOfFirstOrNull(predicate: (T) -> Boolean): Int? {
    val index = indexOfFirst(predicate)
    return if (index >= 0) index else null
}

fun <K, V> Map<K, V>.getOrThrow(key: K): V =
    this[key] ?: throw NoSuchElementException("Key $key not found")

// Scope function alternatives
inline fun <T, R> T.runIf(condition: Boolean, block: T.() -> R): R? =
    if (condition) block() else null

inline fun <T> T.applyIf(condition: Boolean, block: T.() -> Unit): T {
    if (condition) block()
    return this
}
```

## Dependency Injection (Koin)
```kotlin
// Modules
val appModule = module {
    single<UserRepository> { PostgresUserRepository(get()) }
    single<EmailService> { SendGridEmailService(get()) }
    factory { UserService(get(), get()) }
}

val networkModule = module {
    single {
        HttpClient(CIO) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
            install(Logging) {
                level = LogLevel.INFO
            }
        }
    }
}

// Application setup
fun main() {
    startKoin {
        modules(appModule, networkModule)
    }

    val userService: UserService by inject()
}

// Testing with mocks
class UserServiceTest : KoinTest {
    private val mockRepository: UserRepository = mockk()
    private val userService: UserService by inject()

    @Before
    fun setup() {
        startKoin {
            modules(module {
                single<UserRepository> { mockRepository }
                factory { UserService(get()) }
            })
        }
    }

    @Test
    fun `should return user by id`() = runTest {
        val user = User(1, "John", "john@example.com")
        coEvery { mockRepository.findById(1) } returns user

        val result = userService.getById(1)

        assertEquals(user, result)
        coVerify { mockRepository.findById(1) }
    }
}
```

## Null Safety
```kotlin
// Safe calls and Elvis operator
fun processUser(user: User?): String {
    // Safe call
    val name = user?.name

    // Elvis operator
    val displayName = user?.name ?: "Unknown"

    // Safe cast
    val admin = user as? Admin

    // Let for non-null operations
    user?.let { u ->
        println("Processing ${u.name}")
        sendEmail(u.email)
    }

    // Also for side effects
    return user?.also {
        logger.info("User accessed: ${it.id}")
    }?.name ?: "Guest"
}

// Require and check
fun validateUser(user: User?) {
    requireNotNull(user) { "User cannot be null" }
    require(user.age >= 18) { "User must be 18 or older" }
    check(user.isActive) { "User must be active" }
}

// Smart casts
fun processAny(value: Any) {
    when (value) {
        is String -> println(value.length) // Smart cast to String
        is Int -> println(value * 2)       // Smart cast to Int
        is User -> println(value.name)     // Smart cast to User
    }
}
```

## Testing
```kotlin
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldContain
import io.mockk.*

class UserServiceSpec : StringSpec({
    val repository = mockk<UserRepository>()
    val service = UserService(repository)

    beforeTest {
        clearMocks(repository)
    }

    "should create user" {
        val request = CreateUserRequest("John", "john@example.com")
        val expected = User(1, "John", "john@example.com")

        coEvery { repository.save(any()) } returns expected

        val result = service.create(request)

        result shouldBe expected
        coVerify { repository.save(match { it.name == "John" }) }
    }

    "should throw when user not found" {
        coEvery { repository.findById(any()) } returns null

        shouldThrow<NotFoundException> {
            service.getById(999)
        }
    }

    "should filter active users" {
        val users = listOf(
            User(1, "Active", "a@test.com", isActive = true),
            User(2, "Inactive", "b@test.com", isActive = false)
        )
        coEvery { repository.findAll() } returns users

        val result = service.getActiveUsers()

        result.size shouldBe 1
        result.first().name shouldBe "Active"
    }
})
```

## Checklist
- [ ] Data classes for DTOs
- [ ] Sealed classes for state
- [ ] Value classes for type safety
- [ ] Extension functions used idiomatically
- [ ] Coroutines for async
- [ ] Flow for reactive streams
- [ ] Null safety patterns
- [ ] Kotest for testing
- [ ] MockK for mocking
