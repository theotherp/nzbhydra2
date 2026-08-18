# NZBHydra 2 React UI

## Looking at your changes

### `npm run dev` (hot reload)

Start NZBHydra normally, then:

```bash
npm run dev
```

The dev server at <http://localhost:5173> serves the React application with hot module replacement and forwards everything else to the backend at
`http://127.0.0.1:5076`. Bootstrap data is scraped from the backend's React shell on every page load, so the running instance's real configuration, indexers, and permissions are used.

| Variable             | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `HYDRA_BACKEND_URL`  | Backend to proxy and bootstrap from (default port 5076)     |
| `HYDRA_BACKEND_AUTH` | `user:password`, required when the backend has auth enabled |

If the backend is unreachable the dev server logs a warning and falls back to stub bootstrap data, so purely visual work is still possible without it. API calls will fail in that mode.

See `vite/devBackend.ts` for the proxied routes.

### Inside the running Spring Boot application

The application never serves `dist/`. It serves `classpath:/static/react`, and its shell is the Thymeleaf template
`core/src/main/resources/templates/react.html`, which is what inlines the bootstrap data. To refresh the assets of a running backend without a full Maven build:

```bash
VITE_OUT_DIR=../target/classes/static/react npm run build
```

Then hard-reload the browser — the entry bundle has a stable name, so a normal reload can serve a cached one.

The React shell is only rendered when the `nzbhydra-ui` cookie is `react`. Visit `/ui/react` once to select it, and `/ui/legacy` to switch back.
