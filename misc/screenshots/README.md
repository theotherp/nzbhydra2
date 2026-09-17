# Showcase screenshots

`capture.mjs` produces the screenshots linked from the readme. It drives a
running mock-backed test instance with Playwright (borrowed from
`tests/system/node_modules`, so there is nothing extra to install).

```sh
# mock instance on 5076 plus `npm run dev` in core/ui-react
node misc/screenshots/capture.mjs

# against the bundled UI the backend serves itself
node misc/screenshots/capture.mjs --base http://127.0.0.1:5076
```

Options: `--base <url>` (default `http://localhost:5173`), `--out <dir>`
(default `misc/screenshots`, replacing the files the readme links), `--no-seed`.

Seeding runs a handful of searches and requests a few result links so that the
history and statistics pages have something to show. It writes to the instance's
database -- only point this at a throwaway mock instance.

Output:

| File                        | Page                                                          |
|-----------------------------|---------------------------------------------------------------|
| `01-search-form.png`        | Search form with the advanced controls open                   |
| `02-search-suggestions.png` | Same form with the query autocomplete open                    |
| `03-results.png`            | Search results, refine sidebar open, a quality filter applied |
| `04-config.png`             | Config, main section                                          |
| `05-search-history.png`     | Search history                                                |
| `06-download-history.png`   | Download history                                              |
| `07-stats.png`              | Statistics (full page)                                        |
