# React GUI Status

Start at the configured NZBHydra base URL. Append `/ui/react` to select the React GUI, or `/ui/legacy` to return to the legacy GUI.

Currently available in React:

- Search criteria, including media and indexer selection; recent-search refill and repeat; live progress; and result sorting, filtering, grouping, paging, rejection-reason breakdowns, supported download actions, display preferences, and saving executed searches.
- Saved-search listing, reopen, and deletion.
- The statistics shell, indexer status, and search-history paging, filtering, details, and repeat.
- Download-history paging, filtering, status/link display, and NZB/torrent repeat actions.
- Notification-history paging, filtering, and safe title/body/link display.
- The System news page.
- The config area's shell: all eight canonical tabs, a whole-config save that round-trips losslessly (including sections and
  fields no tab yet models) with validation-error/warning handling and restart support. The Main tab is fully editable —
  hosting, proxy, UI, security, logging, backup, updates, history, database, and other settings, including secret fields,
  API-key generation, and server-side file/folder browsing. The Auth tab is fully editable — auth type and its dependent
  field groups, OpenID Connect provider settings, area restrictions, and inline add/edit/remove of the user list, with
  passwords that are never round-tripped in clear text. The remaining six tab bodies are placeholders until FM-061 onward
  add field content.

This is a derived convenience summary, not a parity claim or migration roadmap.
