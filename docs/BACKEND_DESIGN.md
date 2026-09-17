# Mock API Generator — Backend Design

**Status:** current as of the versioning / pagination / governance release
**Audience:** engineers working on or integrating with the backend
**Code:** [`backend/`](../backend)

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [System overview](#2-system-overview)
3. [Data model](#3-data-model)
4. [Request lifecycle](#4-request-lifecycle)
5. [Pagination](#5-pagination)
6. [API versioning](#6-api-versioning)
7. [Conditional requests (ETag)](#7-conditional-requests-etag)
8. [Rate limiting and governance](#8-rate-limiting-and-governance)
9. [Error model](#9-error-model)
10. [Security](#10-security)
11. [Operations](#11-operations)
12. [Testing](#12-testing)
13. [Trade-offs and future work](#13-trade-offs-and-future-work)
14. [Compatibility notes](#14-compatibility-notes)

---

## 1. Purpose and scope

The backend has two jobs:

| Surface | Mounted at | Who calls it | What it does |
|---|---|---|---|
| **Management API** | `/api/v1/**` | The React app, Postman | Users, APIs, versions, endpoints, schemas, generated resources |
| **Mock runtime** | `/:username/:apiPath/:endpointPath[/:resourceId]` | Anyone the API owner allows | Serves the mock endpoints as if they were a real REST API |

The mock runtime is the product. Everything in this document exists to make the mock runtime behave like a well-designed production API: filtering, sorting, four pagination styles, three version-negotiation channels, ETags, lifecycle headers and rate limits.

Out of scope: the frontend, hosting, and Faker-based data generation (see `controllers/resourceController.js`).

## 2. System overview

```
                 ┌────────────────────────────────────────────────────────────────┐
                 │ Express (server.js)                                            │
   React app ──▶ │  express.json · morgan · cors(exposed headers) · trust proxy   │
   Postman   ──▶ │                                                                │
   Consumers ──▶ │  /api/v1 ─ managementLimiter ─▶ routes/index.js                │
                 │              users · apis (+versions) · endpoints · resources  │
                 │              auth middleware (JWT) on every route              │
                 │                                                                │
                 │  /:user/:api/:endpoint ─ mockLimiter ─ delay ─▶ mockController │
                 │              services/mockResolver ─▶ utils/{version,etag,     │
                 │              pagination,sortData,filterData}                   │
                 │                                                                │
                 │  static ../dist + SPA fallback                                 │
                 └───────────────┬────────────────────────────────────────────────┘
                                 │ pg Pool (db/db.js)
                                 ▼
                         PostgreSQL (Neon)
                users ─< apis ─< endpoints ─< resources
```

### Layers

| Layer | Directory | Rule |
|---|---|---|
| Routes | `routes/` | Only wiring: path → middleware chain → controller |
| Middleware | `middleware/` | Cross-cutting: `auth`, `rateLimit`, `delayNMilliSecs` |
| Controllers | `controllers/` | HTTP in / HTTP out; no SQL |
| Services | `services/` | Multi-model orchestration (`mockResolver`) |
| Models | `models/` | One class per table; parameterised SQL only |
| Utils | `utils/` | Pure, unit-tested logic (pagination, sorting, versioning, ETags, errors) |

The pure utilities are deliberately free of Express and database imports, which is what makes them testable with `node --test` and reusable from any controller.

### Runtime

Node ≥ 18 (developed on 22), Express 4, `pg` 8, CommonJS. No build step for the backend.

## 3. Data model

```
users ───────────┐
  id (uuid PK)   │
  username (uq)  │
  email (uq)     │
  password       │
  role, is_active│
                 │ 1:N
apis ◀───────────┘
  id (uuid PK)
  user_id  FK → users ON DELETE CASCADE
  name, description
  base_path                 e.g. "/shop"
  version                   semver "x.y.z"
  is_public
  is_default                pin the version served when none is requested
  deprecated, deprecated_at
  sunset_at                 after this instant the version answers 410
  UNIQUE (user_id, base_path, version)                     uq_apis_user_base_path_version
  UNIQUE (user_id, base_path) WHERE is_default             uq_apis_default_per_base_path
                 │ 1:N
endpoints ◀──────┘
  id (uuid PK)
  api_id  FK → apis ON DELETE CASCADE
  path                      e.g. "/products"
  methods TEXT[]            subset of GET POST PUT PATCH DELETE
  schema JSONB              custom schema → JSON Schema (utils/schemaValidator.js)
  mock_enabled, mock_count, faker_seed
  pagination_config JSONB   { default_style, default_limit, max_limit, always_paginate }
  UNIQUE (api_id, path)
                 │ 1:N
resources ◀──────┘
  id (uuid PK)
  endpoint_id FK → endpoints ON DELETE CASCADE
  parent_resource_ids       relationship bookkeeping
  data JSONB                the payload returned to consumers (+ id)
  created_at, updated_at
  INDEX (endpoint_id, created_at DESC, id DESC)            idx_resources_endpoint_created
```

Design points:

* **An API version is a row in `apis`.** All versions of one mock API share `(user_id, base_path)` and differ by `version`. Each version owns its own endpoints and resources, so v1 and v2 can diverge freely.
* The old global `UNIQUE(base_path)` was dropped: base paths are addressed under `/:username/`, so uniqueness is per user.
* `resources.data` is schemaless JSONB. Filtering / sorting on arbitrary keys therefore happens in the application layer (see §5.6).
* `migrations.js` is idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS`) and upgrades pre-versioning databases in place.

## 4. Request lifecycle

### 4.1 Management API

```
request → managementLimiter → auth (JWT → users row) → controller → model → JSON
```

Controllers validate input, check ownership (`api.user_id === req.user.id`) and call models. Errors are `{ error, code }` (§9).

### 4.2 Mock runtime

```
request
  → mockLimiter                  429 if the (IP, API) budget is exhausted
  → delayNMilliSecs              optional ?delay=<ms> latency simulation
  → mockController.<verb>
      → resolveMockEndpoint()    services/mockResolver.js
          1. load all versions for (username, base_path)      404 API_NOT_FOUND
          2. selectApiVersion(req, versions)                   400/404/406 (§6)
          3. strip api_version from body, set X-API-Version / Vary /
             Deprecation / Sunset / Link successor-version headers
          4. sunset passed?                                    410 API_VERSION_SUNSET
          5. private API? authorize JWT, must be the owner      401 UNAUTHORIZED
          6. find endpoint by (api_id, path, method)           404 ENDPOINT_NOT_FOUND
      → collection: fetch → filter → sort → paginate → ETag    (§5, §7)
      → item:       load (must belong to endpoint) → If-Match / If-None-Match → act
```

Ordering matters: version negotiation happens **before** auth so a private API never reveals which versions or endpoints exist, and rate limiting happens before the delay so a flood of `?delay=30000` requests cannot hold sockets open.

## 5. Pagination

Implemented in [`utils/pagination.js`](../backend/utils/pagination.js) and [`utils/sortData.js`](../backend/utils/sortData.js); wired in `mockController.getAllResources`.

### 5.1 Styles

| Style | Request | Best for | Total count |
|---|---|---|---|
| `page` | `?page=2&limit=10` (`per_page` / `page_size` are aliases of `limit`) | Classic web UIs, "page 3 of 15" | always |
| `offset` | `?offset=20&limit=10` | SQL-minded clients, random access | always |
| `cursor` | `?limit=10` then `?cursor=<opaque>&limit=10` | Infinite scroll, feeds, large or changing data | on `include_total=true` |
| `keyset` | `?after_id=<id>&limit=10` / `?before_id=<id>&limit=10` | Transparent cursor (Twitter `since_id` / `max_id` style) | on `include_total=true` |

### 5.2 Style selection

1. `?pagination=page|offset|cursor|keyset` — explicit.
2. Otherwise inferred from what is present: `cursor` → cursor; `after_id`/`before_id` → keyset; `offset` → offset; `page` → page; only `limit` → the endpoint's `default_style`.
3. No pagination parameters at all → **bare array** (backwards compatible) unless the endpoint sets `always_paginate: true`.

Parameters belonging to a different style than the one selected are rejected with `400 INVALID_PAGINATION_PARAMS` so client mistakes are loud rather than silently ignored.

### 5.3 Envelope

Every paginated response has the same shape:

```json
{
  "data": [ ... ],
  "pagination": { "style": "cursor", "limit": 10, "next_cursor": "…", "prev_cursor": null, "has_more": true, "has_previous": false },
  "links": { "self": "…", "first": "…", "prev": null, "next": "/ibrahim/shop/products?category=even&sort=price&pagination=cursor&limit=10&cursor=…" }
}
```

Per-style `pagination` fields:

| Style | Fields |
|---|---|
| page | `page, limit, total, total_pages, has_more, has_previous` |
| offset | `offset, limit, total, has_more, has_previous` |
| cursor | `limit, next_cursor, prev_cursor, has_more, has_previous[, total]` |
| keyset | `limit, after_id, before_id, first_id, last_id, has_more, has_previous[, total]` |

Links are **relative** and carry every non-pagination parameter of the original request (filters, `sort`, `delay`, version pin), so a client can follow `links.next` blindly. The same links are emitted as an RFC 8288 `Link` header (`rel="first" | "prev" | "next" | "last"`) and totals as `X-Total-Count`, which is what GitHub-style clients expect.

### 5.4 Limits

`limit` must be an integer in `[1, max_limit]`; out-of-range values are `400 INVALID_LIMIT` rather than silently clamped. Defaults come from the endpoint's `pagination_config`, merged over `{ default_style: "page", default_limit: 10, max_limit: 100, always_paginate: false }`. Out-of-range pages/offsets return `200` with an empty `data` array and correct navigation links.

### 5.5 Cursor format and guarantees

A cursor is `base64url(JSON)` of `{ v: 1, s: "<sort string>", k: [<sort key values>], id, d: "next" | "prev" }`.

* **Bound to the sort order.** `s` is the normalised sort spec; using a cursor with a different `sort` is `400 INVALID_CURSOR`. The sort always ends in an `id` tiebreaker, so the order is total and stable.
* **Keyset semantics, not offsets.** The engine binary-searches the boundary key in the sorted list and continues strictly after (or before) it, so inserts and deletes between pages never cause duplicates or skips — even when the boundary record itself was deleted.
* **Opaque by contract, versioned by `v`.** Clients must not construct cursors; the format can change under a new `v`.
* Dates are compared as ISO-8601 strings so a key survives the JSON round-trip unchanged.

### 5.6 Where it runs, and why

The collection pipeline is: `SELECT … WHERE endpoint_id = $1 ORDER BY created_at DESC, id DESC` → filter → sort → paginate, all in memory.

Reasoning:

* `resources.data` is schemaless JSONB. Pushing arbitrary `field[op]=value` filters, multi-field sorts and keyset predicates into SQL requires per-field casts and expression indexes we cannot know ahead of time.
* Filters must apply **before** pagination for every style; doing it in one place (memory) removes a whole class of "total is wrong" bugs the previous implementation had (it paginated in SQL and then filtered the page).
* Mock datasets are bounded by `mock_count` (hundreds to low thousands). One indexed range scan and an in-process sort is well within budget.

The `(endpoint_id, created_at DESC, id DESC)` index makes the fetch an ordered index scan. See §13 for the SQL push-down path if datasets grow.

### 5.7 Sorting

`?sort=field,-other`. Sortable fields are any key of the payload plus row metadata `id`, `created_at`, `updated_at` (payload keys win on collision). Unknown fields are `400 INVALID_SORT`. Nulls sort last regardless of direction. Default: `-created_at,-id`.

## 6. API versioning

Implemented in [`utils/version.js`](../backend/utils/version.js) and [`services/mockResolver.js`](../backend/services/mockResolver.js).

### 6.1 Identity

A mock API is `(username, base_path)`; a **version** is one `apis` row under it. Versions are semver strings; the frontend already enforces `x.y.z`. Creating a version copies endpoints (and, by default, resources) so it starts as a snapshot and then evolves independently.

### 6.2 Negotiation channels

| Channel | Forms | Notes |
|---|---|---|
| Query | `?api-version=2.1.0` · `?api_version=2.1` · `?v=v2` | `api-version` mirrors Azure; `v` mirrors Google |
| Header | `X-API-Version: 2` · `API-Version: 2` · `Accept: application/vnd.mock-api.v2+json` · `Accept: application/vnd.mock-api+json; version=2.1` · `Accept: application/json; version=2` | Vendor media type is the "pure REST" form; custom headers mirror Stripe/GitHub |
| Body | `{ "api_version": "2" }` or `{ "apiVersion": "2" }` on POST/PUT/PATCH | Key is removed before validation and storage |

A request may be a **prefix**: `2` → highest `2.x.y`; `2.1` → highest `2.1.y`; `v` prefix allowed. Exact `2.1.0` matches only that row.

### 6.3 Resolution rules

1. Collect every hint from all channels.
2. Any unparseable hint → `400 INVALID_API_VERSION`.
3. Hints that normalise to different versions → `400 API_VERSION_CONFLICT` (listing each source). Agreeing hints across channels are fine.
4. No hint → **default version**: the row with `is_default`, else the highest non-deprecated version, else the highest version.
5. A hint that matches nothing → `404 API_VERSION_NOT_FOUND` with `available_versions`; `406` when the hint came from `Accept` (content negotiation failed).

Precedence is therefore not "query beats header": conflicts are rejected, because a client sending two different versions is a bug we should surface, not guess at.

### 6.4 Response headers

| Header | When | Value |
|---|---|---|
| `X-API-Version` | always | version actually served |
| `Vary` | always | `Accept, X-API-Version, API-Version` — caches key on negotiation inputs |
| `Deprecation` | version is deprecated | `@<unix seconds>` (RFC 9745), from `deprecated_at` |
| `Sunset` | `sunset_at` set | HTTP-date (RFC 8594) |
| `Link` | deprecated and a newer live version exists | `<…?api-version=X>; rel="successor-version"` |

Once `sunset_at` has passed the version answers `410 API_VERSION_SUNSET` with `successor_version`.

### 6.5 Management endpoints

| Route | Purpose |
|---|---|
| `GET /api/v1/apis/:id/versions` | All versions under the API's base path (semver-sorted) |
| `POST /api/v1/apis/:id/versions` | Clone into a new version: `{ version, description?, is_public?, is_default?, clone_resources? }` — transactional |
| `PUT /api/v1/apis/:id` | Also accepts `is_default`, `deprecated`, `sunset_at`; setting `is_default` demotes siblings atomically |

Uniqueness violations map to `409 API_VERSION_EXISTS` / `409 DEFAULT_VERSION_EXISTS`.

### 6.6 Lifecycle

```
create v2 (clone of v1) ──▶ v2 becomes default (highest live) or pin v1 with is_default
       │
       ▼
mark v1 deprecated (+ sunset_at)  ──▶ consumers see Deprecation / Sunset / Link
       │
       ▼
sunset_at passes ──▶ v1 answers 410 with successor_version ──▶ delete v1 when ready
```

## 7. Conditional requests (ETag)

Implemented in [`utils/etag.js`](../backend/utils/etag.js).

* **Resources** get a strong ETag: `sha1(id : updated_at : stable-json(data))`, plus `Last-Modified`.
* **Collections** get a strong ETag over the serialised response (array or envelope), so the tag changes with filters, sort, page and content.
* `GET` with `If-None-Match` (weak comparison, list or `*`) → `304 Not Modified`.
* `PUT` / `PATCH` / `DELETE` with `If-Match` (strong comparison) → `412 PRECONDITION_FAILED` with `current_etag` when stale. This gives consumers lost-update protection exactly as a real API would.
* `POST` returns `201` with `ETag` and `Location`.

## 8. Rate limiting and governance

Implemented in [`middleware/rateLimit.js`](../backend/middleware/rateLimit.js) on `express-rate-limit`.

| Scope | Routes | Default | Key |
|---|---|---|---|
| management | `/api/v1/**` (except `/ping`) | 300 / 15 min | client IP |
| auth | `POST /users/login`, `POST /users/register` | 20 / 15 min | client IP |
| mock | `/:username/:apiPath/**` | 120 / 1 min | client IP **+** `username/apiPath` |

* Mock traffic is keyed per IP *and* per mock API, so one hot consumer can only exhaust their own budget on one API, not the whole host.
* Responses carry IETF draft-7 `RateLimit` / `RateLimit-Policy` headers; a `429` adds `Retry-After` and `{ error, code: "RATE_LIMITED", scope, limit, window_seconds, retry_after }`.
* `app.set('trust proxy', 1)` so the client IP is read from the first proxy hop (Render) rather than the proxy itself.
* All limits are environment-tunable; `RATE_LIMIT_ENABLED=false` turns them off. The store is in-process memory — see §13 for multi-instance.

Other governance already in place: `?delay` is capped at 30 s; `limit` is capped by `max_limit`; request bodies must be JSON objects.

## 9. Error model

All errors are JSON: `{ "error": "<human message>", "code": "<STABLE_CODE>", ...details }`. `error` is what the existing frontend reads; `code` is what programs should switch on. `utils/httpError.js` provides `HttpError(status, code, message, details)` and `toResponse()` which also normalises legacy `{ status, message }` throws.

| Status | Code | Raised by |
|---|---|---|
| 400 | `INVALID_FILTER` | unknown field / operator / value in a filter |
| 400 | `INVALID_SORT` | malformed or unknown sort field |
| 400 | `INVALID_PAGINATION_STYLE`, `INVALID_PAGINATION_PARAMS`, `INVALID_LIMIT`, `INVALID_PAGE`, `INVALID_OFFSET`, `INVALID_CURSOR`, `INVALID_KEYSET_ANCHOR` | pagination |
| 400 | `INVALID_API_VERSION`, `API_VERSION_CONFLICT` | version negotiation |
| 400 | `INVALID_DELAY`, `BODY_REQUIRED`, `VALIDATION_FAILED` | runtime input |
| 400 | `INVALID_VERSION`, `VERSION_REQUIRED`, `INVALID_FIELD` | management input |
| 401 | `UNAUTHORIZED` | private API without the owner's token |
| 403 | `FORBIDDEN` | management action on someone else's API |
| 404 | `API_NOT_FOUND`, `API_VERSION_NOT_FOUND`, `ENDPOINT_NOT_FOUND`, `RESOURCE_NOT_FOUND` | resolution |
| 406 | `API_VERSION_NOT_FOUND` | unknown version requested via `Accept` |
| 409 | `API_VERSION_EXISTS`, `DEFAULT_VERSION_EXISTS` | uniqueness |
| 410 | `API_VERSION_SUNSET` | version past its sunset date |
| 412 | `PRECONDITION_FAILED` | stale `If-Match` |
| 429 | `RATE_LIMITED` | rate limiter |
| 5xx | — | unexpected; logged server-side, message only |

## 10. Security

* JWT bearer auth on all management routes; private mock APIs re-use the same tokens and require the owner.
* Version negotiation runs before auth, but the only information it can leak for a private API is that *some* version list exists at the path — the same as today's 401.
* All SQL is parameterised; sort/filter field names never reach SQL (they are applied in memory), which is why arbitrary JSON keys are safe.
* Cursors are not signed: they contain only sort-key values the client already saw in the page, and a forged cursor can at most reposition within the same filtered collection.
* Rate limiting on login/register mitigates credential stuffing; the general limiter bounds enumeration.
* CORS is `*` by design (public mocks); the exposed-headers list is explicit so browsers can read `ETag`, `Link`, `X-Total-Count`, `X-API-Version`, `Deprecation`, `Sunset`.

## 11. Operations

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_DEV` | Postgres connection (`NODE_ENV=development` selects `_DEV`) |
| `JWT_SECRET` | token signing |
| `PORT` | listen port (default 3000) |
| `PING_URL`, `PING_INTERVAL` | self-ping to keep the Render dyno awake |
| `RATE_LIMIT_*` | see §8 and `.example.env` |

### Migrations

`npm run migrate` runs `models/migrations.js`; it is safe to re-run and upgrades existing databases (adds versioning columns/indexes, `pagination_config`, the resources index and drops the old `base_path` unique constraint).

### Deployment notes

* Behind a single reverse proxy (Render): `trust proxy = 1`.
* Single instance: in-memory rate-limit store is correct. Multiple instances: wire a shared store (`rate-limit-redis`) into `middleware/rateLimit.js`.

## 12. Testing

`cd backend && npm test` runs `node --test`:

| File | Covers |
|---|---|
| `tests/pagination.test.js` | sort parsing, every pagination style, cursor round-trip / deletion safety / sort binding, links and headers |
| `tests/version.test.js` | semver compare, prefix matching, every negotiation channel, conflicts, defaults, successor |
| `tests/etag.test.js` | stable hashing, weak/strong comparison, 304/412 logic |
| `tests/mockRoutes.test.js` | the real Express router over HTTP against an in-memory fake `db` (`tests/helpers/fakeDb.js`): headers, envelopes, 304/412, 401/404/406/410 |
| `tests/rateLimit.test.js` | per-IP+API keying, draft-7 headers, 429 body |

No database is required. The fake db recognises the SQL shapes the mock router issues; if a model query changes, extend the fake (it fails loudly on unknown SQL).

## 13. Trade-offs and future work

| Decision | Why | When to revisit |
|---|---|---|
| In-memory filter/sort/paginate | correctness for schemaless JSONB, one code path for all styles, bounded datasets | if endpoints exceed ~10k resources: push `created_at`/`id` keyset predicates and `LIMIT` into SQL for the unfiltered default-sort case, add JSONB expression indexes for declared filterable fields |
| Unsigned cursors | no secret management, cursors carry only visible data | if cursors must survive sort/filter changes or be tamper-evident, HMAC them |
| Versions are full clones | simplest mental model, versions diverge freely | if storage matters, share resources between versions via copy-on-write |
| Conflict on multi-channel version mismatch (400) | surfaces client bugs | if a product decision prefers precedence, `resolveRequestedVersion` is the single place to change |
| Relationship `endpointId`s inside cloned schemas still point at the source version's endpoints | keeps the clone cheap and non-breaking | remap ids during clone once relationships are versioned |
| In-memory rate-limit store | single instance today | shared store for horizontal scaling |
| `{ error, code }` rather than RFC 7807 `application/problem+json` | the frontend depends on `error` | add `type`/`title` fields alongside if a problem-details contract is wanted |

## 14. Compatibility notes

* Paginated responses changed from `{ data, page, limit, total }` to `{ data, pagination, links }`. Unpaginated requests still return a bare array.
* `apis.base_path` is no longer globally unique — it is unique per `(user, version)`.
* Reserved query parameters (never treated as filters): `pagination, page, limit, per_page, page_size, offset, cursor, after_id, before_id, include_total, sort, fields, delay, api-version, api_version, v`.
* Error bodies gained a `code` field; `error` is unchanged.
