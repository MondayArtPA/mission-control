# Expense Tracker API

Simple REST API for tracking expenses with JSON file storage.

## Base URL

```text
http://localhost:3000/api/expenses
```

## Endpoints

### Get All Expenses

```http
GET /api/expenses
GET /api/expenses?month=2026-03
GET /api/expenses?category=Food
```

### Get Single Expense

```http
GET /api/expenses/:id
```

### Create Expense

```http
POST /api/expenses
Content-Type: application/json

{
  "title": "Team lunch",
  "amount": 850.5,
  "category": "Food",
  "date": "2026-03-09T12:30:00.000Z",
  "notes": "Client follow-up lunch"
}
```

### Update Expense

```http
PUT /api/expenses/:id
Content-Type: application/json

{
  "amount": 920,
  "notes": "Added parking"
}
```

### Delete Single Expense

```http
DELETE /api/expenses/:id
```

### Delete All Expenses

```http
DELETE /api/expenses
```

### Monthly Summary

```http
GET /api/expenses/summary?month=2026-03
```

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2026-03",
    "totalExpense": 1770.5,
    "count": 3,
    "categoryBreakdown": [
      {
        "category": "Food",
        "total": 1200.5,
        "count": 2
      },
      {
        "category": "Transport",
        "total": 570,
        "count": 1
      }
    ]
  }
}
```

### Request Examples

```http
GET /api/expenses/examples
```

## Validation Rules

- `title` is required and must be a non-empty string
- `amount` is required and must be a number greater than or equal to `0`
- `category` is required and must be a non-empty string
- `date` is required and must be a valid ISO 8601 date string
- `notes` is optional and must be a string when provided
- `month` must use `YYYY-MM` format for summary requests

## TypeScript Types

```typescript
interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Data Storage

Expenses are stored in `data/expenses.json` at the project root. The file is created automatically on first write.

## Quick cURL Examples

```bash
curl http://localhost:3000/api/expenses

curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Team lunch",
    "amount":850.5,
    "category":"Food",
    "date":"2026-03-09T12:30:00.000Z",
    "notes":"Client follow-up lunch"
  }'

curl http://localhost:3000/api/expenses/summary?month=2026-03
```

## Minimal Frontend Example

```typescript
const response = await fetch("/api/expenses/summary?month=2026-03");
const { data } = await response.json();
console.log(data.totalExpense, data.categoryBreakdown);
```
