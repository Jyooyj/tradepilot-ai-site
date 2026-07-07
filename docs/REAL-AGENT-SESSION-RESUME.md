# TradePilot Real Agent Session Resume

## Scope

This round adds task continuity and human confirmation to the existing Real Agent MVP.

It does not add new tools, change the original scoring algorithm, change image recognition logic, change product library storage, change PK/review/report flows, or write products automatically.

## Session Shape

Each Agent session is stored with this shape:

```js
{
  sessionId,
  goal,
  status,
  product,
  result,
  marketEvidence,
  historySummary,
  messages,
  trace,
  missingFields,
  pendingApproval,
  recommendation,
  nextActions,
  createdAt,
  updatedAt
}
```

`messages` contains the OpenAI-compatible chat history used by DashScope Function Calling. `trace` contains only real server-side tool execution results.

## Storage Model

### ECS

ECS uses an in-process memory store in `server/agent/agentStateStore.js`.

This is enough for a single Node.js process managed by PM2. Sessions are not written to disk in this round.

### Visitor Mode Snapshot

The frontend stores Agent session snapshots under a new key:

```text
tradepilot_agent_sessions_v1
```

This key is only for Agent session snapshots. It does not replace or modify the product library key:

```text
tradepilot_local_records
```

### Vercel Serverless

Vercel functions may restart or route consecutive requests to different instances, so memory cannot be the only source of truth.

When `/api/agent/session/:id` cannot find memory state, it returns `snapshot_required`. The frontend then uses `tradepilot_agent_sessions_v1` to send `sessionSnapshot` back to `/api/agent/resume`.

## Resume Flow

1. User starts `POST /api/agent/run`.
2. Agent may return `awaiting_input` with `missingFields`, such as `moq`.
3. The server saves the session in memory and returns `sessionSnapshot`.
4. The frontend saves the snapshot in `tradepilot_agent_sessions_v1`.
5. User fills missing fields.
6. Frontend calls `POST /api/agent/resume` with `sessionId`, `sessionSnapshot`, and `patch`.
7. Server restores from memory first, then falls back to snapshot.
8. Server appends a user message describing the patch.
9. The same Agent loop continues and appends new real tool observations to `trace`.

The resume endpoint does not create a new task when a valid prior session exists.

## Approve Flow

The only supported approval action in this round is:

```text
save_candidate_draft
```

The Agent may return:

```json
{
  "status": "awaiting_approval",
  "pendingApproval": {
    "action": "save_candidate_draft",
    "label": "保存为待拿样候选",
    "reason": "当前利润空间尚可，建议进入候选池进一步比较。"
  }
}
```

`POST /api/agent/approve` records confirmation only. It does not write to the product library.

After approval succeeds, the frontend calls the existing `saveCurrentReport` flow. This preserves the existing product library structure and Supabase/local fallback behavior.

## Guardrails

- Tool whitelist remains: `calculate_profit`, `assess_purchase_risk`, `inspect_market_evidence`.
- Maximum tool rounds remains 4.
- Snapshot and session inputs are normalized before use.
- The Agent cannot auto-access Taobao, 1688, Xiaohongshu, Douyin, or other external platforms.
- The Agent cannot order, pay, contact suppliers, delete records, overwrite records, sync cloud data, import data, or modify scores.
- User-visible text is sanitized to avoid technical internal wording.
- Internal issues are logged with `console.warn`.

## Current Limits

- Sessions are not persisted to a database.
- Vercel continuity depends on the browser snapshot.
- Approval only records a confirmation for `save_candidate_draft`.
- The Agent now includes read-only `retrieve_user_memory` and controlled supplier/content planning tools; sessions store only compact summaries.
- No automatic supplier communication, content publishing, or external marketplace browsing is implemented.

## Next Round

- Real API key end-to-end acceptance.
- ECS deployment acceptance.
- Mobile QR-code scan test.
