# C++ Patterns & Standards

## Project Structure
```
project/
├── CMakeLists.txt
├── cmake/
│   └── modules/
├── include/
│   └── project/
│       ├── core/
│       │   └── types.hpp
│       ├── domain/
│       │   └── user.hpp
│       └── services/
│           └── user_service.hpp
├── src/
│   ├── main.cpp
│   ├── core/
│   ├── domain/
│   └── services/
├── tests/
│   ├── unit/
│   └── integration/
├── benchmarks/
├── docs/
├── conanfile.txt / vcpkg.json
└── .clang-format
```

## CMakeLists.txt Template
```cmake
cmake_minimum_required(VERSION 3.20)
project(ProjectName VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Compiler warnings
add_compile_options(
    -Wall -Wextra -Wpedantic
    -Werror
    -Wconversion
    -Wshadow
    -Wnon-virtual-dtor
)

# Sanitizers (Debug)
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_compile_options(-fsanitize=address,undefined)
    add_link_options(-fsanitize=address,undefined)
endif()

# Find packages
find_package(fmt REQUIRED)
find_package(spdlog REQUIRED)

# Library
add_library(${PROJECT_NAME}_lib
    src/domain/user.cpp
    src/services/user_service.cpp
)
target_include_directories(${PROJECT_NAME}_lib PUBLIC include)
target_link_libraries(${PROJECT_NAME}_lib PUBLIC fmt::fmt spdlog::spdlog)

# Executable
add_executable(${PROJECT_NAME} src/main.cpp)
target_link_libraries(${PROJECT_NAME} PRIVATE ${PROJECT_NAME}_lib)

# Tests
enable_testing()
add_subdirectory(tests)
```

## RAII Pattern
```cpp
// Resource wrapper
class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : file_(std::fopen(path.c_str(), "r")) {
        if (!file_) {
            throw std::runtime_error("Failed to open file: " + path);
        }
    }

    ~FileHandle() noexcept {
        if (file_) {
            std::fclose(file_);
        }
    }

    // Delete copy operations
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    // Move operations
    FileHandle(FileHandle&& other) noexcept : file_(other.file_) {
        other.file_ = nullptr;
    }

    FileHandle& operator=(FileHandle&& other) noexcept {
        if (this != &other) {
            if (file_) std::fclose(file_);
            file_ = other.file_;
            other.file_ = nullptr;
        }
        return *this;
    }

private:
    FILE* file_;
};

// Scope guard
template<typename F>
class ScopeGuard {
public:
    explicit ScopeGuard(F&& f) : func_(std::forward<F>(f)), active_(true) {}
    ~ScopeGuard() { if (active_) func_(); }

    void dismiss() noexcept { active_ = false; }

private:
    F func_;
    bool active_;
};
```

## Smart Pointers
```cpp
// unique_ptr - single ownership
auto user = std::make_unique<User>("John", 30);
process(std::move(user));  // Transfer ownership

// shared_ptr - shared ownership
auto config = std::make_shared<Config>();
service1.setConfig(config);
service2.setConfig(config);

// weak_ptr - non-owning observer
class Observer {
public:
    void observe(std::shared_ptr<Subject> subject) {
        subject_ = subject;  // Store as weak_ptr
    }

    void notify() {
        if (auto s = subject_.lock()) {  // Check if still alive
            s->update();
        }
    }

private:
    std::weak_ptr<Subject> subject_;
};

// Factory function
std::unique_ptr<Base> createDerived(Type type) {
    switch (type) {
        case Type::A: return std::make_unique<DerivedA>();
        case Type::B: return std::make_unique<DerivedB>();
    }
    throw std::invalid_argument("Unknown type");
}
```

## Modern C++ Features
```cpp
// Structured bindings
auto [name, age, email] = getUserInfo();

// std::optional
std::optional<User> findUser(int id) {
    if (auto it = users_.find(id); it != users_.end()) {
        return it->second;
    }
    return std::nullopt;
}

// std::variant
using Value = std::variant<int, double, std::string>;

std::string toString(const Value& v) {
    return std::visit([](auto&& arg) -> std::string {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, std::string>) {
            return arg;
        } else {
            return std::to_string(arg);
        }
    }, v);
}

// std::expected (C++23) or tl::expected
template<typename T>
using Result = std::expected<T, std::error_code>;

Result<User> getUser(int id) {
    if (id <= 0) {
        return std::unexpected(std::make_error_code(std::errc::invalid_argument));
    }
    return User{id, "John"};
}

// Concepts (C++20)
template<typename T>
concept Hashable = requires(T t) {
    { std::hash<T>{}(t) } -> std::convertible_to<std::size_t>;
};

template<Hashable T>
void addToSet(std::unordered_set<T>& set, const T& value) {
    set.insert(value);
}
```

## Error Handling
```cpp
// Exception hierarchy
class AppException : public std::exception {
public:
    explicit AppException(std::string message) : message_(std::move(message)) {}
    const char* what() const noexcept override { return message_.c_str(); }
private:
    std::string message_;
};

class ValidationException : public AppException {
public:
    using AppException::AppException;
};

// noexcept specification
void swap(Data& a, Data& b) noexcept {
    std::swap(a.data_, b.data_);
}

// Expected-based error handling
enum class ErrorCode { NotFound, InvalidInput, Timeout };

template<typename T>
using Result = std::expected<T, ErrorCode>;

Result<User> findUser(int id) {
    if (id <= 0) return std::unexpected(ErrorCode::InvalidInput);
    // ...
}
```

## Testing with GoogleTest
```cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>

// Mock class
class MockRepository : public IUserRepository {
public:
    MOCK_METHOD(std::optional<User>, findById, (int id), (override));
    MOCK_METHOD(void, save, (const User& user), (override));
};

// Test fixture
class UserServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        repository_ = std::make_unique<MockRepository>();
        service_ = std::make_unique<UserService>(*repository_);
    }

    std::unique_ptr<MockRepository> repository_;
    std::unique_ptr<UserService> service_;
};

TEST_F(UserServiceTest, FindById_ExistingUser_ReturnsUser) {
    // Arrange
    User expectedUser{1, "John"};
    EXPECT_CALL(*repository_, findById(1))
        .WillOnce(::testing::Return(expectedUser));

    // Act
    auto result = service_->findById(1);

    // Assert
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->name, "John");
}

// Parameterized test
class ValidationTest : public ::testing::TestWithParam<std::tuple<std::string, bool>> {};

TEST_P(ValidationTest, ValidateEmail) {
    auto [email, expected] = GetParam();
    EXPECT_EQ(isValidEmail(email), expected);
}

INSTANTIATE_TEST_SUITE_P(
    EmailTests,
    ValidationTest,
    ::testing::Values(
        std::make_tuple("test@example.com", true),
        std::make_tuple("invalid", false),
        std::make_tuple("", false)
    )
);
```

## Performance Considerations
```cpp
// Move semantics
class Data {
public:
    // Move constructor
    Data(Data&& other) noexcept
        : buffer_(std::exchange(other.buffer_, nullptr))
        , size_(std::exchange(other.size_, 0)) {}

    // Move assignment
    Data& operator=(Data&& other) noexcept {
        if (this != &other) {
            delete[] buffer_;
            buffer_ = std::exchange(other.buffer_, nullptr);
            size_ = std::exchange(other.size_, 0);
        }
        return *this;
    }
};

// Reserve capacity
std::vector<int> numbers;
numbers.reserve(1000);  // Avoid reallocations

// String view for non-owning references
void process(std::string_view text) {
    // No copy, works with string, char*, string_view
}

// Cache-friendly iteration
// Good: sequential access
for (const auto& item : items) { /* ... */ }

// Bad: random access
for (size_t i : randomIndices) {
    process(items[i]);
}
```

## Checklist
- [ ] RAII for all resources
- [ ] Smart pointers (no raw new/delete)
- [ ] const correctness
- [ ] noexcept where applicable
- [ ] Rule of 5 implemented
- [ ] Move semantics utilized
- [ ] No C-style casts
- [ ] Compiler warnings as errors
- [ ] Sanitizers in debug builds
- [ ] Unit tests with GoogleTest
