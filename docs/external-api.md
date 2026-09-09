# The external API

NZBHydra has a small HTTP API for people who want to read data out of their instance from their own scripts,
dashboards or monitoring: statistics, the search, download and notification history, the current log file, and
backups. It lives under `/externalapi/v1` on the same host and port as the web interface, for example
`http://127.0.0.1:5076/externalapi/v1`, and it answers JSON.

It is separate from two other things that look similar:

- `/api` is the Newznab/Torznab API that Sonarr, Radarr, NZB clients and the like use. It has its own
  specification and is not meant for reading stats or history.
- `/internalapi` is what the web interface itself talks to. It is not a public interface: it changes between
  releases without notice and, since CSRF protection is enforced, plain scripts can no longer call it for anything
  but reads.

The external API is the supported way to get at this data. Its request and response formats are stable within a
version: fields may be added, but existing ones keep their names and meaning. Incompatible changes, should they ever
be needed, would appear under a new version path and the old one would stay.

## Authentication

Every request needs your API key, the one from the main settings that you also give to Sonarr and friends. Send it
in the `X-Api-Key` header, or as the `apikey` query parameter if headers are awkward in your tool. Nothing else is
needed: no login, no session, no cookie, no CSRF token, and the API ignores the user accounts and restrictions
configured for the web interface.

A request without the key, or with a wrong one, gets a `404 Not Found` with an empty body, exactly as if the path
did not exist. That is deliberate: someone scanning your instance learns nothing about what is behind it. If you get
a 404 on every call, check the key first. There is a ping call you can use for that.

## What it offers

- **Statistics** over a time range you choose: indexer API accesses, response times, download shares, searches and
  downloads per weekday and hour, per-user and per-IP shares, and so on. You can ask for only the sections you need,
  since some of them take a while to compute on a large history.
- **History**, paged and filterable: searches, downloads and notifications, each with a time range, sort order and a
  few route-specific filters such as the query, the indexer or the download status.
- **The current log file**, as plain text, so you can grep it or feed it to a log collector. It is the file as it is
  on disk, not the anonymised version used for bug reports.
- **Backups**: create one on demand, list the existing ones, and download any of them. Restoring is not offered here
  and stays in the web interface.

Searching, downloading, changing the configuration and managing indexers are not part of this API and will not be.

## Where to find the details

The exact routes, parameters and response fields are documented in the swagger UI that ships with NZBHydra. Open
`/swagger-ui/index.html` on your instance while logged in as an admin. The selector at the top offers two
definitions, *externalapi* (this API) and *newznab* (the Newznab/Torznab API that Sonarr and friends use); choose
*externalapi* and you can read every call, see an example request and answer for it, and try it directly from the
browser after entering your key with the *Authorize* button. The same description is available as OpenAPI JSON under
`/v3/api-docs/externalapi` if you prefer to generate a client from it. Nothing else NZBHydra maps is documented
there: what the web interface itself calls is not a public interface.

If something you need is missing, open an issue and say what you want to build with it.
