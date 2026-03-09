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

### Monthly Summary (Mission Control metrics)

```http
GET /api/expenses/summary?month=2026-03
```

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2026-03",
    "totalExpense": 476.5,
    "count": 9,
    "categoryBreakdown": [
      {
        "category": "analysis",
        "total": 112.15,
        "count": 2
      }
    ],
    "breakdown": {
      "byAgent": [
        { "key": "MONDAY", "total": 228.1, "count": 4 }
      ],
      "byCategory": [],
      "byModel": []
    },
    "metrics": {
      "currency": "THB",
      "totals": {
        "budget": 1500,
        "alertThreshold": 1200,
        "restrictThreshold": 1395,
        "spent": 476.5,
        "remaining": 1023.5,
        "usagePct": 31.8,
        "status": "normal"
      },
      "counts": {
        "entries": 9,
        "daysWithSpend": 5,
        "filesScanned": 1,
        "ignoredEntries": 0
      },
      "trend": {
        "daily": [
          { "date": "2026-03-09", "total": 476.5, "cumulative": 476.5 }
        ]
      },
      "logs": {
        "daysProcessed": ["2026-03-09"],
        "missingDays": ["2026-03-01"]
      },
      "breakdown": {
        "byAgent": [
          { "key": "MONDAY", "total": 228.1, "count": 4, "percent": 47.9 }
        ],
        "byCategory": [
          { "key": "analysis", "total": 112.15, "count": 2, "percent": 23.5 }
        ],
        "byModel": [
          { "key": "Claude 3.5 Sonnet", "total": 91, "count": 2, "percent": 19.1 }
        ]
      }
    }
  }
}
```

### Mission Control Breakdowns

```http
GET /api/expenses/by-agent?month=2026-03
GET /api/expenses/by-model?month=2026-03
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
