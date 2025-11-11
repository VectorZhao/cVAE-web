# cVAE Interior Explorer (cVAE-web)

This project is a modern, astronomy-themed frontend for the [cVAE exoplanet interior API](https://github.com/VectorZhao/cVAE_API). It allows researchers to assemble payloads for every public endpoint, inspect the eight returned interior parameters, interact with histograms, and export the visualisations as high‑resolution PNGs. The UI targets the hosted API at `https://api.deepexo.eu.org/api` by default but can be pointed at any compatible deployment through environment variables.

## Key capabilities

- **Payload builders** for `single_prediction`, `multi_prediction`, `prediction_with_gaussian`, and `file_prediction` endpoints.
- **Interactive parameter explorer** that renders WRF, MRF, CRF, WMF, CMF, `P_CMB`, `T_CMB`, and `K2` distributions with descriptive statistics.
- **Runtime API switching**. The app reads `VITE_API_BASE_URL` at build time and `API_BASE_URL` at runtime (via `env-config.js`), so the same Docker image can be reused across environments.
- **PNG exports** of the currently selected case to support publications or slide decks.
- **Dark, astronomy-inspired UI** powered by MUI 7 and Chart.js.

## Project structure

```
.
├── public/
│   └── env-config.js          # Runtime-injected API base URL
├── src/
│   ├── api/                   # Axios client for the cVAE API
│   ├── components/            # Forms, dashboards, and visual widgets
│   ├── utils/                 # Distributions normalisation + stats helpers
│   ├── constants.ts           # Parameter metadata
│   └── config.ts              # Env + runtime config resolver
├── Dockerfile                 # Multi-stage build (Node + Nginx)
└── docker/
    ├── entrypoint.sh          # Injects API_BASE_URL into env-config.js
    └── nginx.conf             # Nginx SPA config
```

## Getting started locally

```bash
# 1. Install dependencies
npm install

# 2. (optional) Point at a different API during development
echo "VITE_API_BASE_URL=https://api.deepexo.eu.org/api" > .env

# 3. Start the dev server
npm run dev
```

The Vite dev server defaults to `http://localhost:5173`. Requests will be sent to `VITE_API_BASE_URL` if provided, otherwise to the configured runtime/default API.

## Input conventions

- `Mass` and `Radius` are expressed in Earth units (M⊕ / R⊕). The model was trained on masses within **0.1 – 10 M⊕**, so inputs outside that window will be rejected.
- `Fe/Mg` and `Si/Mg` represent **bulk molar ratios**.
- Gaussian form standard deviations (`std`) are treated as **relative errors** and should stay within `[0, 1]`.

### Building

```bash
npm run build
npm run preview   # optional: serve the production bundle locally
```

## Runtime configuration

- **Build time**: set `VITE_API_BASE_URL` (optional) to change the default API label.  
- **Dev proxy**: when running `npm run dev`, use `VITE_PROXY_TARGET=https://your-api.example.com/api` (or edit `.env`) so that Vite proxies `/api` to your backend, avoiding CORS issues.  
- **Runtime (Docker/Static hosting)**:
  - `API_BASE_URL`: human-readable API label shown in the UI (defaults to `https://api.deepexo.eu.org/api`).
  - `API_REQUEST_BASE`: path the frontend uses when issuing requests (defaults to `/api`). Keep this relative so the built-in Nginx proxy can attach to your backend.
  - `API_UPSTREAM_URL`: the real backend URL that Nginx forwards to (defaults to `API_BASE_URL`). This must include the `/api` suffix exposed by the backend, e.g. `https://api.deepexo.eu.org/api`.
  
The entrypoint writes both `env-config.js` (consumed by the SPA) and `/etc/nginx/conf.d/default.conf` before booting Nginx, so the same container image can be pointed at different backends without rebuilding.

## Docker deployment

```bash
# Build the image
docker build -t cvae-web .

# Run with a custom API endpoint
docker run -d \
  -p 8080:80 \
  -e API_BASE_URL=https://api.deepexo.eu.org/api \
  -e API_UPSTREAM_URL=https://api.deepexo.eu.org/api \
  -e API_REQUEST_BASE=/api \
  --name cvae-web \
  cvae-web
```

The SPA is served by Nginx on port 80 and automatically injects the API metadata plus proxy configuration every time the container starts.

## Working with the API

Endpoints exposed by the backend (summarised from the upstream README):

| Endpoint | Description | Payload key points |
| --- | --- | --- |
| `GET /api/hello` | Health check | – |
| `POST /api/single_prediction` | Scalar/batch payloads | Lists for Mass, Radius, Fe/Mg, Si/Mg. Optional `Times`. |
| `POST /api/multi_prediction` | Batch helper | Same payload as single. |
| `POST /api/file_prediction` | Upload numpy/csv/excel/parquet | Form field `file`, optional `Times`. |
| `POST /api/prediction_with_gaussian` | Gaussian sampling | For each feature provide `value` and `std`. Optional `sample_num`, `Times`. |

The explorer mirrors these schemas via dedicated forms and automatically visualises the eight returned distributions for each case.

## Exported artefacts

- `dist/` — the production-ready SPA bundle (created via `npm run build`).
- `env-config.js` — runtime script holding both the display URL and the request base path (`window.__CVEA_CONFIG__`). This file should not be cached aggressively; the included Nginx config sets `Cache-Control: no-store`.

## License

This frontend is provided under the MIT License, matching the upstream API project. See `LICENSE` if present at the repository root.
