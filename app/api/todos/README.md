# Todo List API

Simple REST API for managing todos, built with Next.js API Routes.

## Base URL

```
http://localhost:3000/api/todos
```

## Endpoints

### Get All Todos

```http
GET /api/todos
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1234567890",
      "title": "Buy groceries",
      "completed": false,
      "createdAt": "2026-03-09T02:00:00.000Z",
      "updatedAt": "2026-03-09T02:00:00.000Z"
    }
  ]
}
```

### Get Single Todo

```http
GET /api/todos/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "title": "Buy groceries",
    "completed": false,
    "createdAt": "2026-03-09T02:00:00.000Z",
    "updatedAt": "2026-03-09T02:00:00.000Z"
  }
}
```

### Create Todo

```http
POST /api/todos
Content-Type: application/json

{
  "title": "New todo item"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "title": "New todo item",
    "completed": false,
    "createdAt": "2026-03-09T02:00:00.000Z",
    "updatedAt": "2026-03-09T02:00:00.000Z"
  }
}
```

### Update Todo

```http
PUT /api/todos/:id
Content-Type: application/json

{
  "title": "Updated title",
  "completed": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "title": "Updated title",
    "completed": true,
    "createdAt": "2026-03-09T02:00:00.000Z",
    "updatedAt": "2026-03-09T02:10:00.000Z"
  }
}
```

### Delete Single Todo

```http
DELETE /api/todos/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Todo deleted"
}
```

### Delete All Todos

```http
DELETE /api/todos
```

**Response:**
```json
{
  "success": true,
  "message": "All todos deleted"
}
```

## Data Storage

Todos are stored in `data/todos.json` at the project root. This file is created automatically on first use.

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing with cURL

### Get all todos
```bash
curl http://localhost:3000/api/todos
```

### Create a todo
```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

### Update a todo
```bash
curl -X PUT http://localhost:3000/api/todos/1234567890 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

### Delete a todo
```bash
curl -X DELETE http://localhost:3000/api/todos/1234567890
```

## Integration Example

```typescript
// Fetch all todos
const response = await fetch('/api/todos');
const { success, data } = await response.json();

// Create new todo
const response = await fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'New task' })
});

// Update todo
const response = await fetch(`/api/todos/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ completed: true })
});

// Delete todo
const response = await fetch(`/api/todos/${id}`, {
  method: 'DELETE'
});
```

## TypeScript Types

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```
