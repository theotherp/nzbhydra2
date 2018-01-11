### v1.0.16
Fix: Make sure users don't enter an insane download limit value
Fix: Would let results forbidden by regexes through
Feature: Add option to disable CSRF protection and disable it by default

### v1.0.15
Feature: Pull NZB download status from configured downloaders instead of relying on extension scripts
Feature: Add button to check caps for all/all incomplete (yellow) indexers
Fix: Anonymize username:password pairs in URLs in logs
Fix: Torznab results were returned wrong, preventing Hydra from being added to radarr

### v1.0.14
Fix: Gracefully shutdown when restarting or quitting while search requests are handled

### v1.0.13
Fix: NZBs proxied from indexers were returned with wrong / random seeming file name

### v1.0.12
Feature: Allow migrating only the config, skipping the database migration

### v1.0.11
Fix: Fix error in auth introduced in a previous version

### v1.0.10
Feature: Improve the logging for web exceptions (which are often swallowed which makes debugging harder)
Fix: Name of the category would not update in the category dropdown box on the search page
Fix: Allow searching without a query in the UI

### v1.0.9
Fix: Allow NZBHydra2 to be shown in an iFrame (e.g. organizr)

### v1.0.8
Fix: Increase lengths for columns which may contain very long texts (errors, queries)

### v1.0.7
Fix: Fix bug in wrapper that I introduced in last version. Oh well...

### v1.0.6
Note: Improve the way the host is determined. External URL should not need to be set when not using a reverse proxy
Note: Remove PyYAML dependency from wrapper

### v1.0.5
Note: Make migration a bit more stable
Note: Make sure wrapper is started from correct folder

### v1.0.4
Note: So many fixes

### v1.0.3
Note: So many fixes

### v1.0.2
Note: First public release. Welcome!
