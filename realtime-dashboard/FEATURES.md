# 📊 LiveDash Features

## Dashboard Overview

### Live Metric Cards
- **Revenue** — Total sales in real time
- **Orders** — Number of orders processed
- **Active Users** — Concurrent session count
- **Conversion Rate** — Sales/visitor percentage

Each card shows:
- Current value (formatted: $ for revenue, % for conversion, K/M for large numbers)
- % change from previous value (green ↑ or red ↓)
- Current region/category
- **SPIKE badge** when change > ±10%

### Real-Time Charts

#### Line Charts (updated every 3 seconds)
- **Revenue (Indigo)** — 60-point history, shows trends clearly
- **Orders (Green)** — Order volume over time
- **Active Users (Amber)** — User engagement patterns
- **Conversion Rate (Red)** — Percentage trend

Charts automatically crop oldest data point when reaching 60 points (5 minutes of history).

#### Bar Chart
- **Revenue by Region** — Last 5 minutes of data
- Categories: North, South, East, West
- Refreshes every ~30 seconds
- Color-coded bars for easy scanning

### Connection Status

Top-left indicator shows:
- **🟢 Live** — Connected to SignalR, receiving real-time updates
- **🔴 Connecting…** — Lost connection, auto-reconnecting

### Pause/Resume
- **⏸ Pause** button stops all incoming updates (useful for discussing specific data points)
- **▶ Resume** re-enables real-time streaming

---

## AI Chat Sidebar

### Smart Data Insights

Type any question about your metrics:

| Question | AI Response |
|----------|------------|
| "Why did revenue spike?" | Analyzes recent spikes and suggests causes |
| "Which region is underperforming?" | Compares regional data from last 5 min |
| "Are orders growing?" | Checks trend direction and growth rate |
| "What's the conversion trend?" | Identifies if conversion is improving |

### How It Works

1. **You type** a question in the sidebar text box
2. **Chat immediately adds** your message (optimistic UI)
3. **App sends** your question + current chart data (JSON snapshot) to Claude
4. **Claude analyzes** the data and responds with insights
5. **Response appears** in chat thread with markdown formatting

### Suggested Questions

Quick-start buttons for common queries:
- "Why did revenue spike?"
- "Which region is underperforming?"
- "What is the conversion rate trend?"
- "Are orders growing or declining?"

Click any button to auto-fill and send.

### Chat Features

- ✅ **Markdown rendering** — AI responses support bold, code blocks, lists
- ✅ **Chat history** — All messages stored per session (not persisted across page reloads yet)
- ✅ **Typing indicator** — Three bouncing dots while Claude is thinking
- ✅ **Timestamps** — Each message shows HH:MM:SS
- ✅ **Clear history** — Button to reset conversation
- ✅ **Auto-scroll** — Always shows newest message

---

## Backend Services

### MetricBroadcastService (Every 3 Seconds)

**What it does:**
- Generates mock metric data with realistic random walk
- 5% chance of "spike" event (±20% change)
- 95% chance of normal variance (±5% change)
- Persists metrics to MySQL
- Broadcasts to all connected SignalR clients

**Data points**:
- `revenue`: $45,000 ± variance
- `orders`: 320 ± variance
- `users`: 1,240 ± variance
- `conversion`: 3.4% ± variance

### MetricsController

REST endpoints for historical queries:

```
GET /api/metrics/summary
→ Latest value + timestamp for each metric

GET /api/metrics/history?name=revenue&limit=60
→ Last 60 data points (5 min) for single metric

GET /api/metrics/by-category?name=revenue
→ Revenue grouped by region (last 5 min)
```

### ChatController

AI integration endpoints:

```
POST /api/chat/ask
← Request: { question, chartDataJson, sessionId }
→ Response: { answer, sessionId }

GET /api/chat/history/{sessionId}
→ All messages in session (role + content + timestamp)
```

### SignalR Hub (`/hubs/metrics`)

**Real-time push from server to browser:**

Event: `MetricUpdate`
```typescript
MetricSnapshot {
  name:           string  // "revenue" | "orders" | "users" | "conversion"
  value:          number
  category:       string  // region or product line
  recordedAt:     DateTime
  changePercent:  number  // vs previous value
}
```

Emitted every 3 seconds to all connected clients.

---

## Frontend Architecture

### Services

#### SignalRService
- Manages WebSocket connection to `/hubs/metrics`
- Auto-reconnect with exponential backoff (0ms → 2s → 5s → 10s)
- Emits `metrics$` observable on each update
- Tracks `connected$` and `paused$` state

#### MetricsService
- REST calls to `/api/metrics/*` endpoints
- `getHistory()` — chart data
- `getSummary()` — latest values
- `getByCategory()` — region breakdown

#### ChatService
- POST requests to `/api/chat/ask`
- Maintains message array in `messages$` observable
- Generates unique `sessionId` (UUID v4) per conversation
- Tracks `loading$` state for UI feedback

### Components

#### MetricCardComponent
- Input: `MetricSnapshot`
- Displays formatted value, % change, category
- Highlights spikes with orange glow + animation

#### LineChartComponent
- Input: `MetricHistory[]` (max 60 points)
- Chart.js line with fill + gradient
- Updates instantly on every metric tick (no animation lag)
- Responsive sizing

#### BarChartComponent
- Input: `{ category, total }[]`
- Chart.js bar chart with color rotation
- Updates every ~30 seconds

#### ChatSidebarComponent
- Input: current `MetricSnapshot[]`
- Manages message list UI
- Markdown rendering via `marked` library
- Auto-scroll to latest message
- Send on Enter (Shift+Enter for newline)

### Dashboard Page
- Orchestrates all components
- Connects to SignalR on init
- Maintains 4 line chart histories (capped at 60)
- Subscribes to metric updates → appends to history arrays

---

## Data Flow

```
┌─────────────────────────────────────────┐
│ Backend MetricBroadcastService          │
│ (Generates mock data every 3s)          │
└──────────────┬──────────────────────────┘
               │
      ┌────────▼─────────┐
      │ MySQL (Persists) │
      └──────────────────┘
               │
      ┌────────▼──────────────────┐
      │ SignalR Hub (Broadcasts)  │
      └──────────┬────────────────┘
               │ (WebSocket)
    ┌──────────▼─────────────┐
    │ Angular SignalRService │
    └──────────┬─────────────┘
               │
    ┌──────────▼──────────────────────┐
    │ DashboardComponent               │
    │ - Appends to history arrays      │
    │ - Updates metric card values     │
    │ - Triggers chart re-renders      │
    └──────────────────────────────────┘
```

## Chat Flow

```
┌─────────────────────────────┐
│ User types question         │
│ + presses Enter             │
└──────────────┬──────────────┘
               │
    ┌──────────▼───────────────────┐
    │ ChatService.ask()             │
    │ - Add user message to UI      │
    │ - Set loading = true          │
    └──────────┬────────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ POST /api/chat/ask           │
    │ - Include current metrics    │
    │ - Include sessionId          │
    └──────────┬───────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ ClaudeService                │
    │ - Calls Claude API           │
    │ - Parses JSON response       │
    │ - Returns answer text        │
    └──────────┬───────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Backend persists:            │
    │ - User message               │
    │ - Assistant response         │
    │ - SessionId                  │
    └──────────┬───────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Frontend receives response   │
    │ - Add AI message to UI       │
    │ - Render markdown            │
    │ - Set loading = false        │
    └──────────────────────────────┘
```

---

## Authentication (Future)

Currently, there's a placeholder for user auth:
- `UsersController` is defined but not wired up
- `ChatSession` tracks `UserId` = 1 (hardcoded)
- JWT bearer auth is in the NuGet packages but not implemented

To add auth:
1. Uncomment JWT middleware in `Program.cs`
2. Create `AuthController` with login/register
3. Return JWT on successful login
4. Update `ChatController.Ask()` to read `User.FindFirst("sub")`
5. Use that UserId instead of hardcoded 1

---

## Performance Notes

- **SignalR**: 3-second update interval prevents overwhelming the UI/DB
- **Chart.js**: Disabled animations on updates for 60fps feel
- **MySQL indexing**: `(name, recordedAt)` composite index on Metrics table
- **Browser storage**: Chat history in memory only (could add localStorage if needed)
- **Angular**: Standalone components, minimal bundle size

---

## Customization Ideas

### Add More Metrics
1. Extend `MetricBroadcastService._previous` dictionary
2. Add UI cards for new metrics
3. Wire up new line charts

### Change Update Frequency
- Modify `Task.Delay(3_000)` in `MetricBroadcastService`

### Alert on Spike
- Add `if (spike) { await _hub.Clients.All.SendAsync("SpikAlert", ...); }`
- Subscribe to `SpikAlert` in Angular, show toast

### Historical Data Export
- Add endpoint: `GET /api/metrics/export?startDate=...&endDate=...&format=csv`
- Download CSV with all metrics in range

### Dark Mode Toggle
- Already dark theme, but add SCSS theme variables for easy switching
