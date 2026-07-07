# TradePilot Real Agent Memory

## Scope

This round adds one read-only long-term memory tool:

```text
retrieve_user_memory
```

The tool reads existing product library records and saved review data that the frontend already has loaded. It does not add new product storage, change scoring, change image recognition, write records, delete records, overwrite records, sync cloud data, or access external platforms.

## Data Sources

The frontend sends:

- `historyRecords`: current product library records already loaded in the app.
- `review`: current page review data, used only as current context.
- `historySummary`: a compact summary saved into the Agent session snapshot.

The tool reads saved review data from each product record:

- `record.review`
- `record.result.review`

It also reads product/result fields already present in product records, such as category, price, MOQ, channel, status, and risks.

## Visitor Mode

Visitor mode still uses the existing product library key:

```text
tradepilot_local_records
```

The Agent does not create a second product library. It receives the records already loaded by the existing storage layer.

Agent session snapshots still use:

```text
tradepilot_agent_sessions_v1
```

Snapshots store `historySummary`, not the full product library.

## Login Mode

Login mode keeps the existing Supabase sync flow.

The Agent uses the current `historyRecords` already loaded in the frontend after the normal product library sync. This round does not add a Supabase Agent memory table and does not change Supabase write behavior.

## Tool Behavior

`retrieve_user_memory` is registered in `server/agent/agentToolRegistry.js`.

The LLM may choose to call it. When called, the server executes the tool and appends the real observation to the Function Calling message loop. The frontend only displays the returned trace; it does not fake memory reads.

The server does not trust model-invented history records. The tool analyzes only request-provided `historyRecords` from the runtime context.

## Evidence Level

Evidence level is calculated from real records:

- `none`: no available history records.
- `limited`: 1-2 similar records, or history exists but no close match.
- `moderate`: 3-5 similar records.
- `strong`: 6 or more similar records and at least one relevant review record.

If evidence is `none` or `limited`, the tool returns:

```text
当前历史样本量有限，建议仅作为辅助参考。
```

## Analysis Dimensions

The tool summarizes:

- category match with the current product;
- historical price range;
- MOQ distribution;
- channel distribution;
- whether review data exists;
- interaction rate;
- inquiry rate;
- conversion rate;
- test cost and cost per order;
- common risks;
- similar record count;
- whether sample size is enough.

## Over-Inference Control

The tool never outputs absolute conclusions such as "一定会爆" or "最适合补货".

It reports sample size, evidence level, and cautious recommendation notes. When records are sparse, it frames memory as auxiliary context only.

## Data Protection

The frontend does not show raw JSON, internal tool arguments, or full private record payloads.

The trace observation contains compact summaries only:

- product name/category;
- price/MOQ/channel/status;
- review metrics if present;
- risks and notes.

Images, long notes, supplier details, and complete product records are not exposed in the Agent panel.

## Current Limits

- Long-term memory is request-scoped and session snapshot stores only `historySummary`.
- No dedicated database memory table is added.
- Similarity matching is conservative: category/name first, with broad fallback only when no close match exists.
- The tool is read-only and cannot save a candidate by itself.

## Next Round

- Real API key end-to-end acceptance.
- ECS deployment acceptance.
- Mobile QR-code scan test.
