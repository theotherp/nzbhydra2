# Database upgrade to H2 2.4 and notes for container maintainers

NZBHydra2 bundles the H2 database engine. Starting with the release that contains this document the bundled
version is 2.4.240 (previously 2.1.214). H2 2.4 cannot open files written by 2.1, so the first start after the
update migrates `data/database/nzbhydra.mv.db` once. The same start also rebuilds the `SEARCHRESULT` table with a
sequential primary key, which is the fix for database files growing to many gigabytes (see `misc/h2growth/PLAN.md`
for the analysis).

## What happens on the first start

1. Hydra reads the file header. `format:2` (written by 2.1 or 2.2) triggers the migration, `format:3` means nothing
   to do.
2. Before touching the file it checks that the data folder has free space of at least twice the database file size
   plus 500 MB. If that check fails, Hydra stops with a clear message and the file is unchanged.
3. It exports the database to an SQL script in the data folder and imports the script into a temporary database with
   the bundled H2. Both steps run inside the Hydra process: H2 2.1.214 is bundled under a relocated package name (`org.nzbhydra.h2legacy.org.h2`, built by the `other/h2legacy` module) so that it can be used next to the current
   H2. Nothing is downloaded and no `java` executable is needed.
4. Row counts of every table are compared. Only when they match is the old file renamed to
   `nzbhydra.mv.db.old.bak.<timestamp>` and the new file moved into place. The backup is deleted after 14 days.
5. Flyway then runs the schema migration `V8`, which keeps only search results that are referenced by a download.
   Search results are a short-lived cache, so a search made right before the update has to be repeated; the download
   history, stats and configuration are unaffected.

Large databases take minutes and need the disk space described above. If the process is killed during the
migration, the original file is still in place and the migration is retried on the next start.

## Instructions for container maintainers

- **Nothing has to be added to the image.** The migration runs entirely inside the Hydra process: it needs no
  `java` executable, no network access and no extra file. This also holds for images that ship the native `core`
  executable.
- **Allow the container to shut down gracefully.** On shutdown Hydra runs `SHUTDOWN COMPACT`, which is what returns
  a bloated database file to its real size. Docker's default stop grace period of 10 seconds is too short for large
  files. Set `stop_grace_period: 120s` in compose (or `docker stop -t 120`) and make sure the entrypoint forwards
  `SIGTERM` to the Hydra process instead of killing it. The compaction time Hydra spends is capped by the
  `databaseCompactTime` setting (default 15 seconds); the shutdown itself needs a few more seconds.
- **Free disk space**: the data volume needs twice the size of `nzbhydra.mv.db` plus 500 MB during the migration.
- Nothing else changes: paths, ports, environment variables and the config file stay the same. The default of
  `databaseWriteDelay` drops from 5000 to 500 ms; existing configs that still hold the old default are updated
  automatically.

## Databases written by H2 1.4

Only `format:2` files (H2 2.1 and 2.2) are migrated. A `format:1` file, written by H2 1.4 and last seen in NZBHydra
versions before v3, makes Hydra stop right away without touching the file. Migrate it with NZBHydra 8.x first - that
was the last version able to convert 1.4 databases - and then update again, or delete `nzbhydra.mv.db` to start with
an empty database (the config and the NZB files are kept; the download history and the stats are lost).
