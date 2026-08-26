# React GUI Status

The React GUI is the only GUI: the configured NZBHydra base URL serves it, and so does every canonical route. The
AngularJS GUI it replaced, and the cookie selector that used to switch between the two, were removed by FM-095.

Currently available:

- Form-auth login and logout: a `/login` page, a header login/logout affordance with legacy's visibility rules, and a
  redirect to `/login` for a FORM-restricted anonymous session. BASIC-auth login (the browser credential challenge) also
  works; ending a BASIC session does not yet take effect (the browser replays its cached credentials).
- Startup checks and announcements: the first-start welcome dialog, sequential user news, the admin news dialog, VIP
  indexer-expiry warnings, and the admin-only show-once warnings (out-of-memory, outdated update wrapper, open-to-internet
  without auth, Java below 17, failed backup) all run once per app load.
- Admin sessions see cross-route update banners pinned at the viewport bottom: an update-available banner (with an
  externally-updated variant) offering its changelog, an ignore action, and installing the update; and an
  automatic-update notice with its own changelog and dismissal.
- A live downloader-status footer, cross-route, shown when a downloader is enabled and status display is on: state,
  queue count, current download title/progress, and a rate sparkline, fed by a live connection. Live in-app notification
  toasts for admin sessions when enabled in settings.
- Search criteria, including media and indexer selection; recent-search refill and repeat; live progress; and result sorting, filtering, grouping (with legacy's one-time TV-episode grouping help, shown once per user), each row's indexer shown with its configured colour, paging, rejection-reason breakdowns, supported download actions, display preferences, and saving executed searches.
- Saved-search listing, reopen, and deletion.
- The statistics dashboard — date-range and disabled-indexer selection, per-family statistics selection with persisted
  choices, overview KPI tiles, a sortable consolidated indexer table, grouped activity charts, config-gated source-share
  charts, and a download-age histogram, each with full underlying data reachable in an accessible table.
- Indexer status, and search-history paging, filtering, details, and repeat.
- Download-history paging, filtering, status/link display, and NZB/torrent repeat actions.
- Notification-history paging, filtering, and safe title/body/link display.
- The System area's shell: all eight canonical tabs (Control, Updates, Log, Tasks, Backup, Bugreport/Debug, News, About),
  admin-gated. The Control tab is fully working — restart, shutdown, and reloading the config from file. The News tab is
  fully working. The Updates tab is fully working — current/latest/beta version status, release and beta update offers,
  changelog and full version history, and installing an update with progress feedback and an automatic restart handoff.
  The About tab is fully working — program, contact, license, and sponsor information. The Log tab is fully working —
  a formatted (JSON) log with paging and an entry-detail dialog, the raw current log file with auto-refresh and tail
  follow, and a downloadable log-file list. The Backup tab is fully working — creating a backup (with or without
  downloading), listing and downloading existing backups, restoring from an existing backup, and uploading a backup
  file to restore with progress feedback. The Bugreport/Debug tab is fully working — bug-reporting guidance, a debug-info
  archive (download or upload to a file share), a thread-dump trigger, a sensitive-data-logging toggle, heap-dump and
  HTTP-endpoint links, a SQL debug console, and a live CPU-usage chart with an accessible data table. The Tasks tab is
  fully working — the scheduled-task list with last/next execution times and a per-task run-now action. All eight
  canonical system tabs are now fully working.
- The config area's shell: all eight canonical sections in a left settings sidebar (a drawer on narrow viewports), each
  entry flagging its own unsaved changes and validation errors; a save bar that stays in reach while a long tab scrolls,
  saying how many settings changed and offering to discard them; advanced settings that announce themselves instead of
  disappearing, so a fieldset hiding them offers "N advanced settings hidden" and reveals them in place (the sidebar's
  advanced toggle still shows them all at once); a search field in that save bar that finds any setting on any of the
  eight tabs by its name or its help text, grouped by section, and on picking one jumps to its tab, scrolls to it,
  reveals it if an advanced gate was hiding it, and marks it briefly; a review panel opened from that save bar's
  "N settings changed" summary, listing every changed setting with its section and its old and new value — a list entry
  summarized as added, removed or edited, a secret never shown on either side — and offering the same Save; and a
  whole-config save that round-trips losslessly
  (including sections and fields no tab yet models) with validation-error/warning handling and restart support. The Main tab is fully editable —
  hosting, proxy, UI, security, logging, backup, updates, history, database, and other settings, including secret fields,
  API-key generation, and server-side file/folder browsing. The Auth tab is fully editable — auth type and its dependent
  field groups, OpenID Connect provider settings, area restrictions, and inline add/edit/remove of the user list, with
  passwords that are never round-tripped in clear text. The Categories tab is fully editable — the three catalog-wide
  settings and inline add/edit/remove of categories with their search type, subtype, word and regex restrictions, size
  presets, newznab category numbers, and ignore rules. The Notifications tab is fully editable — the Apprise transport and
  GUI display settings, and per-event notification entries added from an event-type menu, each with its own URLs, title and
  body templates, message type, per-event template help, and a test-send action. The Searching tab is fully editable —
  indexer access, category handling, query generation/processing, result filtering, processing, display, quick filters,
  and duplicate detection, plus custom title mappings edited through a help-and-test dialog that proves a mapping against
  example input before it is kept. The Downloading tab is fully editable — the general download settings and black-hole
  folders, and a downloader list where each entry is added from a preset (NZBGet, SABnzbd, Torbox) and edited in a modal
  transaction that verifies its connection before the entry is accepted, with credentials that are never round-tripped in
  clear text. The External Tools tab is fully editable — the sync-on-config-change switch and a list of Sonarr, Radarr,
  Lidarr, and Readarr entries, each added from a preset or custom and edited in a modal transaction that tests the
  connection before writing NZBHydra's settings into the tool, plus a sync-all action. The Indexers tab is fully
  editable — the ordered indexer list with per-entry state, priority, and incomplete-config/incomplete-caps markers;
  adding a newznab, torznab, or special indexer from a preset or as a custom entry; a modal transaction that
  connection-checks and completes an entry's capabilities before it is accepted, with credentials that are never
  round-tripped in clear text; a colour field with a native picker and a clear button alongside the free-text value;
  bulk capability rechecking for incomplete or all indexers with per-indexer progress; and
  importing a whole Jackett or Prowlarr indexer set, replacing the list and reporting added/updated/removed counts.
  All eight canonical config tabs are now fully editable.

This is a derived convenience summary, not a parity claim or migration roadmap.
