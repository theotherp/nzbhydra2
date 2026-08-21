# React GUI Status

Start at the configured NZBHydra base URL. Append `/ui/react` to select the React GUI, or `/ui/legacy` to return to the legacy GUI.

Currently available in React:

- Search criteria, including media and indexer selection; recent-search refill and repeat; live progress; and result sorting, filtering, grouping, paging, rejection-reason breakdowns, supported download actions, display preferences, and saving executed searches.
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
  file to restore with progress feedback. The other tabs are not yet migrated.
- The config area's shell: all eight canonical tabs, a whole-config save that round-trips losslessly (including sections and
  fields no tab yet models) with validation-error/warning handling and restart support. The Main tab is fully editable —
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
  round-tripped in clear text; bulk capability rechecking for incomplete or all indexers with per-indexer progress; and
  importing a whole Jackett or Prowlarr indexer set, replacing the list and reporting added/updated/removed counts.
  All eight canonical config tabs are now fully editable.

This is a derived convenience summary, not a parity claim or migration roadmap.
