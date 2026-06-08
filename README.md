# GitHub Repository Popularity Ranker

Full-stack TypeScript app that fetches GitHub repositories, computes a
transparent popularity score, and ranks them. Filter by language and creation
date; sort by score, stars, forks, or recent activity.

## Architecture

    Frontend (React/Vite) → HTTP/JSON → Backend (Node/Express) → HTTPS → GitHub Search API

The backend is a thin proxy + computation layer: it validates input, calls the
GitHub Search API once per search, computes a popularity score per repo, and
returns the ranked set. The frontend handles presentation and input only.

## Scoring

    score = 0.5 * log10(stars + 1)
          + 0.3 * log10(forks + 1)
          + 0.2 * exp(-daysSincePush / 30)

Scaled to 0–100. Log normalization tames the skew of star/fork counts;
exponential decay on `pushed_at` rewards active projects. Each response
includes a per-component breakdown so rankings are explainable. Weights and
half-life live in `backend/src/config/scoring.ts`. See `docs/adr/0001`.

## Key features

- Single GitHub request per search (no N+1).
- Query-level cache with ETag conditional requests and stale-while-revalidate
  (`docs/adr/0002`): repeat searches are instant and self-heal.
- Two guards: Zod payload validation and a per-IP Express rate limiter, both
  emitting a consistent `{ error: { message, code } }` envelope.
- Structured logging (Pino) with a correlation id per request.
- Score explainability in the API and UI.
- URL-driven search state (shareable links, refresh persistence).
- AbortController request cancellation to prevent stale-response races.
- OpenAPI/Swagger docs at `/docs`.
- Stateless backend, horizontally scalable (`docs/adr/0003`).

## Running

### Local

    # Backend
    cd backend
    npm install
    npm run dev        # http://localhost:4000  (docs at /docs)

    # Frontend (separate terminal)
    cd frontend
    npm install
    npm run dev        # http://localhost:5173

### Docker

    docker compose up

## Environment (backend/.env)

    PORT=4000
    GITHUB_TOKEN=            # optional PAT; raises GitHub rate limit
    GITHUB_API_URL=https://api.github.com
    CACHE_TTL_MS=60000       # freshness window before SWR revalidation
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX=60        # max requests per IP per window
    CORS_ORIGIN=http://localhost:5173

## API

`GET /api/repositories`

| Param        | Type   | Notes                                  |
|--------------|--------|----------------------------------------|
| language     | string | e.g. `typescript`                      |
| createdAfter | date   | `YYYY-MM-DD`                           |
| perPage      | number | 1–100, default 30                      |
| page         | number | default 1; page*perPage ≤ 1000         |
| sortBy       | enum   | score \| stars \| forks \| recent      |

Returns `{ total, items, rateLimitRemaining }`.

Errors use a consistent envelope: `{ "error": { "message", "code" } }` with
status 400 (validation), 429 (our limiter or GitHub), 502 (upstream), 500.

## Testing

    cd backend
    npm test                 # unit, property-based, route, cache, rate-limit
    npm run test:coverage

Property-based tests (fast-check) assert scoring invariants: bounded output,
monotonicity in stars and recency, breakdown sums to total, no NaN/Infinity.

## Decisions

Architecture Decision Records live in `docs/adr/`:

- `0001` Log-normalized scoring with exponential recency decay.
- `0002` Query-level caching with ETag + stale-while-revalidate.
- `0003` No datastore or message queue (matched to on-demand model).