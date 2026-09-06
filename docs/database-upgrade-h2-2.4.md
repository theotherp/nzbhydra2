# Database upgrade to H2 2.4 and notes for container maintainers

NZBHydra2 bundles the H2 database engine. Starting with the release that contains this document the bundled
version is 2.4.240 (previously 2.1.214). H2 2.4 cannot open files written by 2.1, so the first start after the
update migrates `data/database/nzbhydra.mv.db` once. The same start also rebuilds the `SEARCHRESULT` table with a
sequential primary key, which is the fix for database files growing to many gigabytes (see `misc/h2growth/PLAN.md`
for the analysis).

## What happens on the first start

1. Hydra reads the file header. `format:2` (written by 2.1) or `format:1` (written by 1.4) triggers the migration,
   `format:3` means nothing to do.
2. Before touching the file it checks that a Java runtime is available and that the data folder has free space of at
   least twice the database file size plus 500 MB. If either check fails, Hydra stops with a clear message and the
   file is unchanged.
3. It downloads the matching old H2 jar from Maven Central, exports the database to an SQL script in the data folder
   using that jar in a separate Java process, and imports the script into a temporary database with the bundled H2.
4. Row counts of every table are compared. Only when they match is the old file renamed to
   `nzbhydra.mv.db.old.bak.<timestamp>` and the new file moved into place. The backup is deleted after 14 days.
5. Flyway then runs the schema migration `V8`, which keeps only search results that are referenced by a download.
   Search results are a short-lived cache, so a search made right before the update has to be repeated; the download
   history, stats and configuration are unaffected.

Large databases take minutes and need the disk space described above. If the process is killed during the
migration, the original file is still in place and the migration is retried on the next start.

## Instructions for container maintainers

- **A Java 17 or newer runtime must be available inside the image** (`java` on the `PATH`, or `JAVA_HOME` set) for
  the one-time export step, also for images that ship the native `core` executable. Without it Hydra refuses to
  start and logs what is missing. A JRE is enough. This was already required for the 1.4 to 2.x migration.
- **Allow the container to shut down gracefully.** On shutdown Hydra runs `SHUTDOWN COMPACT`, which is what returns
  a bloated database file to its real size. Docker's default stop grace period of 10 seconds is too short for large
  files. Set `stop_grace_period: 120s` in compose (or `docker stop -t 120`) and make sure the entrypoint forwards
  `SIGTERM` to the Hydra process instead of killing it. The compaction time Hydra spends is capped by the
  `databaseCompactTime` setting (default 15 seconds); the shutdown itself needs a few more seconds.
- **Outbound HTTPS to `repo1.maven.org` is needed once** during the migration to fetch the old H2 jar. Images that
  block outbound traffic must allow it for the first start after the update, or the maintainer can place the jar
  manually: the migration accepts a local copy at `data/h2-2.1.214.jar` (or `data/h2-1.4.200.jar` for 1.4 files).
- **Free disk space**: the data volume needs twice the size of `nzbhydra.mv.db` plus 500 MB during the migration.
- Nothing else changes: paths, ports, environment variables and the config file stay the same. The default of
  `databaseWriteDelay` drops from 5000 to 500 ms; existing configs that still hold the old default are updated
  automatically.
