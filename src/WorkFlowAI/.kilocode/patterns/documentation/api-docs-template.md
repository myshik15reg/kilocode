# API Reference: [Service Name]

> Версия API: v1
> Базовый URL: `https://api.example.com/v1`

## Аутентификация
Все запросы должны содержать заголовок `Authorization`:
```http
Authorization: Bearer <your_token>
```

## Ошибки
Стандартный формат ошибки:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with id 123 not found",
    "details": {}
  }
}
```

## Endpoints

### Users

#### `GET /users`
Получить список пользователей.

**Query Parameters:**
- `page` (int, default=1): Номер страницы
- `limit` (int, default=10): Элементов на странице

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1
  }
}
```

#### `POST /users`
Создать нового пользователя.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

### Orders

#### `GET /orders/{id}`
Получить детали заказа.

**Path Parameters:**
- `id` (uuid): ID заказа

**Response (200 OK):**
```json
{
  "id": "uuid",
  "items": [],
  "total": 100.50,
  "status": "pending"
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found"
  }
}