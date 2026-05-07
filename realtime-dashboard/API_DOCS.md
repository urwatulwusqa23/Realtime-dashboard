# 📡 API Documentation

## Base URLs

| Environment | URL |
|---|---|
| Local Dev | `http://localhost:5000` |
| Local Docker | `http://localhost` (nginx proxies to backend) |
| Azure Prod | `https://yourapp.azurewebsites.net` |

## Metrics API

### GET `/api/metrics/summary`

Returns the latest value for each metric.

**Response:**
```json
[
  {
    "name": "revenue",
    "value": 47325.50,
    "recordedAt": "2024-05-02T14:23:45.123Z"
  },
  {
    "name": "orders",
    "value": 341,
    "recordedAt": "2024-05-02T14:23:45.123Z"
  },
  {
    "name": "users",
    "value": 1289,
    "recordedAt": "2024-05-02T14:23:45.123Z"
  },
  {
    "name": "conversion",
    "value": 3.65,
    "recordedAt": "2024-05-02T14:23:45.123Z"
  }
]
```

**Use case:** Get current values for metric cards (fallback when SignalR not connected)

---

### GET `/api/metrics/history`

Returns historical data points for a single metric.

**Query Parameters:**
- `name` (string, required) — metric name: `revenue`, `orders`, `users`, or `conversion`
- `limit` (integer, optional, default=60) — number of points to return

**Example:**
```
GET /api/metrics/history?name=revenue&limit=60
```

**Response:**
```json
[
  {
    "value": 44100.00,
    "recordedAt": "2024-05-02T13:58:15.000Z",
    "category": "North"
  },
  {
    "value": 44325.75,
    "recordedAt": "2024-05-02T13:58:18.000Z",
    "category": "South"
  },
  ...
]
```

**Use case:** Populate line charts on dashboard load

---

### GET `/api/metrics/by-category`

Returns revenue aggregated by region (last 5 minutes).

**Query Parameters:**
- `name` (string, optional, default=`revenue`) — metric to aggregate

**Example:**
```
GET /api/metrics/by-category?name=revenue
```

**Response:**
```json
[
  {
    "category": "North",
    "total": 12450.25
  },
  {
    "category": "South",
    "total": 11890.50
  },
  {
    "category": "East",
    "total": 10240.75
  },
  {
    "category": "West",
    "total": 9855.00
  }
]
```

**Use case:** Populate bar chart showing regional breakdown

---

## Chat API

### POST `/api/chat/ask`

Sends a question + live chart data to Claude API, returns AI-generated insight.

**Request:**
```json
{
  "question": "Why did revenue spike?",
  "chartDataJson": "{\"timestamp\":\"2024-05-02T14:25:30.000Z\",\"metrics\":[{\"name\":\"revenue\",\"value\":47500,\"changePercent\":12.5},...]}",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Fields:**
- `question` (string, required) — user's question about the data
- `chartDataJson` (string, required) — current metrics snapshot as JSON string
  - Should include all 4 metrics with current values
  - Can be stringified from frontend with: `JSON.stringify({ timestamp, metrics })`
- `sessionId` (string, optional) — UUID for conversation continuity
  - If omitted, server generates new UUID
  - Returned in response for future requests

**Response:**
```json
{
  "answer": "The revenue spike of 12.5% is likely due to the North region seeing a surge in orders. This could indicate a successful marketing campaign or seasonal demand increase in that area. The conversion rate also improved by 3%, suggesting better customer engagement.",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Fields:**
- `answer` (string) — Claude's natural language response (supports markdown)
- `sessionId` (string) — session ID for this conversation

**Status Codes:**
- `200 OK` — Successful response from Claude
- `400 Bad Request` — Missing required fields
- `500 Internal Server Error` — Claude API error (check API key)

**Use case:** Send questions about live metrics, get AI insights

---

### GET `/api/chat/history/{sessionId}`

Retrieves all messages in a chat session.

**Path Parameters:**
- `sessionId` (GUID, required) — session identifier

**Example:**
```
GET /api/chat/history/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
[
  {
    "role": "user",
    "content": "Why did revenue spike?",
    "createdAt": "2024-05-02T14:25:45.000Z"
  },
  {
    "role": "assistant",
    "content": "The revenue spike of 12.5% is likely due...",
    "createdAt": "2024-05-02T14:25:50.000Z"
  },
  {
    "role": "user",
    "content": "Which region contributed most?",
    "createdAt": "2024-05-02T14:26:10.000Z"
  },
  {
    "role": "assistant",
    "content": "The North region...",
    "createdAt": "2024-05-02T14:26:15.000Z"
  }
]
```

**Fields:**
- `role` (string) — `"user"` or `"assistant"`
- `content` (string) — message text
- `createdAt` (datetime) — UTC timestamp

**Status Codes:**
- `200 OK` — Returns all messages (empty array if session doesn't exist)
- `400 Bad Request` — Invalid GUID format

**Use case:** Load chat history when user revisits a session

---

## SignalR Hub (`/hubs/metrics`)

Real-time WebSocket connection for streaming metric updates.

### Connection

**JavaScript/TypeScript:**
```typescript
import * as signalR from '@microsoft/signalr';

const hub = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5000/hubs/metrics')
  .withAutomaticReconnect([0, 2000, 5000, 10000])
  .build();

await hub.start();
```

### Server → Client Event: `MetricUpdate`

Emitted every 3 seconds with all current metrics.

**Payload:**
```typescript
MetricSnapshot[] = [
  {
    name: "revenue",
    value: 47325.50,
    category: "North",
    recordedAt: "2024-05-02T14:23:45.123Z",
    changePercent: 5.25
  },
  {
    name: "orders",
    value: 342,
    category: "Electronics",
    recordedAt: "2024-05-02T14:23:45.123Z",
    changePercent: 3.75
  },
  // ... users, conversion
]
```

**Fields:**
- `name` (string) — metric identifier
- `value` (number) — current value
- `category` (string) — region or product line (can vary per metric)
- `recordedAt` (datetime) — server timestamp (UTC)
- `changePercent` (number) — % change from previous value (positive = increase)

**Subscribe in Angular:**
```typescript
this.hub.on('MetricUpdate', (snapshots: MetricSnapshot[]) => {
  console.log('Updated metrics:', snapshots);
  // Update UI
});
```

**Use case:** Real-time chart updates, metric card refresh every 3 seconds

---

## Error Handling

### Common Error Responses

**500 — Claude API Key Invalid**
```json
{
  "error": "AI service returned an error. Check your API key in appsettings.json."
}
```

**400 — Missing Required Field**
```json
{
  "error": "Question is required."
}
```

**500 — Database Connection Failed**
```
Internal Server Error — Make sure MySQL is running and connection string is correct.
Check logs: docker compose logs backend
```

---

## Rate Limiting

Currently **no rate limiting** is implemented. For production:

1. Add NuGet package: `AspNetCoreRateLimit`
2. Configure in `Program.cs`:
   ```csharp
   builder.Services.AddMemoryCache();
   builder.Services.AddInMemoryRateLimiting();
   
   var rateLimitConfig = new RateLimitConfiguration
   {
       ClientIdHeader = "X-Client-Id",
       HttpStatusCode = System.Net.HttpStatusCode.TooManyRequests,
       IpWhitelist = new List<string> { "127.0.0.1", "::1/128" },
       ClientWhitelist = new List<string> { "admin-key" },
       RateLimitPolicies = new Dictionary<string, RateLimitPolicy>
       {
           { "strict", new RateLimitPolicy { Period = "1m", Limit = 100 } }
       }
   };
   builder.Services.Configure<RateLimitOptions>(opt => opt.GeneralRules = new List<RateLimitRule> { ... });
   ```

---

## CORS Configuration

Backend accepts requests from origins listed in `AllowedOrigins` setting.

**Local Dev (`appsettings.Development.json`):**
```json
"AllowedOrigins": "http://localhost:4200,http://localhost"
```

**Production (`appsettings.Production.json`):**
```json
"AllowedOrigins": "https://yourdomain.com,https://www.yourdomain.com"
```

If you get a CORS error:
1. Check your Angular URL matches exactly (including port)
2. Update `AllowedOrigins` in appsettings.json
3. Restart the API

---

## Testing with cURL

### Get latest metrics
```bash
curl -s http://localhost:5000/api/metrics/summary | jq
```

### Get revenue history
```bash
curl -s "http://localhost:5000/api/metrics/history?name=revenue&limit=10" | jq
```

### Get category breakdown
```bash
curl -s http://localhost:5000/api/metrics/by-category | jq
```

### Ask Claude a question
```bash
curl -X POST http://localhost:5000/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Is revenue growing?",
    "chartDataJson": "{\"timestamp\":\"2024-05-02T14:25:30Z\",\"metrics\":[]}",
    "sessionId": null
  }' | jq
```

---

## Pagination

Currently **no pagination** on history endpoints. All results returned in one response.

For large datasets (>10,000 records), consider adding:

```csharp
[HttpGet("history")]
public async Task<IActionResult> GetHistory(
    [FromQuery] string name = "revenue",
    [FromQuery] int skip = 0,
    [FromQuery] int take = 60)
{
    var data = await _db.Metrics
        .Where(m => m.Name == name)
        .OrderByDescending(m => m.RecordedAt)
        .Skip(skip)
        .Take(take)
        ...
}
```

---

## OpenAPI/Swagger

Full interactive API documentation available at:
- **Local**: http://localhost:5000/swagger
- **Azure**: https://yourapp.azurewebsites.net/swagger

Use Swagger UI to test endpoints without cURL.
