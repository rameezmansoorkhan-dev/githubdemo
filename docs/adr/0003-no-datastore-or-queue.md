# 3. No datastore or message queue

Date: 2025-06-01

## Status
Accepted

## Context
It is tempting to add a database, a message queue, background workers, or a
search index to a "ranking" service. The actual requirement here is narrow:
on-demand search over the GitHub API with computed scoring, returned in a
single request/response cycle. There is no requirement to persist results,
track repositories over time, run scheduled ingestion, or fan out work.

## Decision
Keep the backend stateless with no datastore, no message queue, and no
background workers. State that exists (the query cache and rate-limit counters)
is in-memory and treated as disposable. Scoring is computed on demand from the
live GitHub response.

## Consequences
- Positive: dramatically simpler to build, test, deploy, and reason about. The
  stateless backend scales horizontally behind a load balancer with no
  coordination. No schema, migrations, or operational database to run.
- Negative: nothing is persisted, so there is no historical tracking of repo
  popularity over time and no offline analytics beyond what logs provide. Cache
  and rate-limit state are per-instance until moved to Redis.
- Documented triggers for revisiting this decision:
  - Continuous repo tracking / popularity-over-time → ingestion pipeline,
    which implies a datastore and likely a queue.
  - Heavy write or fan-out workloads → message queue + workers.
  - Full-text or complex querying beyond GitHub's API → a search index.
  Until one of these requirements is real, adding the infrastructure would be
  overengineering.