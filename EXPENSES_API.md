# Mission Control Expense Metrics API

Phase 1 introduces a read-only expense data layer that derives spend from the agent activity logs stored under `~/.openclaw/logs/YYYY-MM-DD.md`. Each entry that includes a Baht-denominated cost, agent, and (optionally) model/category metadata is parsed into a normalized record, aggregated month-to-date, and returned via dedicated REST endpoints.

- **Monthly budget:** ฿1,500
- **Alert threshold (80%):** ฿1,200
- **Restrict threshold (93%):** ฿1,395
- **Currency:** THB only (non-THB entries are ignored until a conversion table is introduced)

> All endpoints live under `http://localhost:3000/api/expenses/...` and accept an optional `month=YYYY-MM` query string. When omitted, the current (Bangkok) month-to-date window is used.

## Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/expenses/summary` | Mission Control summary: MTD totals, thresholds, trend, and breakdowns by agent/category/model. |
| `GET /api/expenses/by-agent` | Lightweight per-agent spend list for the requested month. |
| `GET /api/expenses/by-model` | Model-level spend list for the requested month. |

## Data Model

Each parsed log line becomes an internal record with:

- `timestamp` (`ISO-8601`), inferred using the Bangkok timezone (`+07:00`).
- `agent`, from the `[...]` prefix or `[agent: X]` metadata tags.
- `model`, from `[model: ...]` tags or by keyword detection (`GPT`, `Gemini`, `Claude`, etc.).
- `category`, from `[category: ...]` tags or fallback keyword heuristics (`analysis`, `dev`, `comms`, `exec`, `model-usage`).
- `amount` in THB (decimals supported). Non-THB entries are tracked but excluded from totals.

The parser also tracks:

- `filesScanned` — number of log files touched for the month.
- `ignoredEntries` — log lines with missing costs or unsupported currencies.
- `daysProcessed` / `missingDays` — to highlight coverage gaps in Mission Control.

## Sample Responses

### `/api/expenses/summary`

```http
GET /api/expenses/summary?month=2026-03
```

```json
{
  "success": true,
  "data": {
    "month": "2026-03",
    "periodStart": "2026-03-01T00:00:00.000Z",
    "periodEndExclusive": "2026-04-01T00:00:00.000Z",
    "isMonthToDate": false,
    "totalExpense": 476.5,
    "count": 9,
    "categoryBreakdown": [
      { "category": "analysis", "total": 112.15, "count": 2 },
      { "category": "dev", "total": 136.35, "count": 3 }
    ],
    "breakdown": {
      "byAgent": [
        { "key": "MONDAY", "total": 228.1, "count": 4 },
        { "key": "BLUEPRINT", "total": 136.35, "count": 3 }
      ],
      "byCategory": [
        { "key": "analysis", "total": 112.15, "count": 2 }
      ],
      "byModel": [
        { "key": "Claude 3.5 Sonnet", "total": 91, "count": 2 }
      ]
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
        "missingDays": ["2026-03-01", "2026-03-02", "…"]
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

### `/api/expenses/by-agent`

```http
GET /api/expenses/by-agent
```

```json
{
  "success": true,
  "data": {
    "month": "2026-03",
    "currency": "THB",
    "total": 476.5,
    "breakdown": [
      { "key": "MONDAY", "total": 228.1, "count": 4, "percent": 47.9 },
      { "key": "BLUEPRINT", "total": 136.35, "count": 3, "percent": 28.6 },
      { "key": "QUANT", "total": 112.05, "count": 2, "percent": 23.5 }
    ],
    "stats": {
      "entries": 9,
      "filesScanned": 1,
      "ignoredEntries": 0
    }
  }
}
```

### `/api/expenses/by-model`

```http
GET /api/expenses/by-model?month=2026-03
```

```json
{
  "success": true,
  "data": {
    "month": "2026-03",
    "currency": "THB",
    "total": 476.5,
    "breakdown": [
      { "key": "Claude 3.5 Sonnet", "total": 91, "count": 2, "percent": 19.1 },
      { "key": "GPT-5.4 Turbo", "total": 89.15, "count": 2, "percent": 18.7 },
      { "key": "Gemini 1.5 Pro", "total": 23.75, "count": 1, "percent": 5.0 }
    ],
    "stats": {
      "entries": 9,
      "filesScanned": 1,
      "ignoredEntries": 0
    }
  }
}
```

## Implementation Notes

- **Log coverage:** If a day lacks a `.md` log file or contains no billable entries, it shows up under `metrics.logs.missingDays`. Use this to wire alerts for silent spend or logging outages.
- **Timezone:** Parsing assumes the `Asia/Bangkok` timezone (`UTC+07:00`). If logs move to another zone, update the constants in `lib/expense-metrics.ts`.
- **Extensibility:** The parser currently recognises `GPT`, `Claude`, `Gemini`, `Haiku`, `Sonnet`, `Opus`, `Llama`, `Mistral`, `PaLM`, `Phi` tokens. Extend `detectModel()` if new providers are introduced.
- **Currency:** Only THB contributes to totals. USD (or other) entries are ignored but counted in `ignoredEntries` so we can decide when to add FX conversion.
- **Budget statuses:**
  - `normal` — below 80% budget.
  - `alert` — ≥ ฿1,200.
  - `restrict` — ≥ ฿1,395.
  - `over` — ≥ ฿1,500 (hard stop).

## Testing

1. Ensure you have at least one log file under `~/.openclaw/logs` with spend entries (e.g., `฿45.5`).
2. From the repo root run `npm run lint` (type-safety + formatting) and/or `npm run dev` to hit the endpoints locally.
3. Optional sanity check:

```bash
curl -s http://localhost:3000/api/expenses/summary | jq .
```

Expect `success: true` with the metrics payload shown above.
