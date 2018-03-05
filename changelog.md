### v1.4.5
Fix: Improve caps check for some results using a TV show's initialism instead of the full name in the title

### v1.4.4
Fix: Handle LL searches better that request a general category and a subcategory (e.g. 7000,7020)

### v1.4.3
Fix: Migration failed because of missing datatabase table

### v1.4.2
Fix: Allow configuration of basic auth credentials for jackett

### v1.4.1
Fix: Indexers with incomplete config were shown in selection list but not actually usable
Fix: Some issues with indexers not beeing reenabled and some confusing messages being shown. The whole thing with indexers being disabled after errors is still a bit wonky
Fix: Some potential memory leaks

### v1.4.0
Feature: Rewrote the display of indexer statuses. An indexer's status is now displayed in the indexer config section (where you would probably expect it). The 'Enabled' switch was extended and now will show one of the states 'Enabled', 'Temporarily disabled', 'Permanently disabled' or 'User disabled' and an explanation. THe Indexer statuses view does still show alle the indexers' statuses but is less cluttered
Feature: Show search results filter box in table header because some users didn't find the filter icons
Fix: Prevent weird 'Unexpected error in hydra code. Sorry...'

### v1.3.3
Feature: Improve conversion of newznab categories to internal categories
Fix: Exception in migration when providing no database file even when migration of database was requested
Feature: Allow loading of UI files from local folder to allow proper development of UI

### v1.3.2
Fix: Settings file was sometimes corrupted (wrong charset) and could not be loaded anymore
Fix: Delete error column in indexer status page when indexer is reenabled
Fix: Button to browse file system for selecting torrent folder would fail on some systems (e.g. docker)

### v1.3.1
Feature: Display serious errors on windows in message box
Fix: Hopefully reduced chance of empty config files being written
Fix: Handle duplicate results from indexers better (should rarely happen)
Note: NZBHydra will recognize if it's running on windows and in folder like c:\program files or c:\program files (x86) and refuse to start. Those folders have special read/write rights which might cause some problems. I recommend putting any programs that are not installed by a setup in a "regular" folder

### v1.3.0
Feature: Experimental feature to use a packaged CA certs file. This probably doesn't concern you but it may solve some SSL related issues with some newer or different JREs
Fix: Sort indexer download shares by share
Fix: Made the migration process a tiny bit more robust wrt wrong input
Fix: Display caps check button for indexers without API key (e.g. spotweb instances). Hide button and search type and ID fields for new indexer. The check is done automatically

### v1.2.6
Fix: Sabnzbd history could not be properly parsed, preventing download status updates

### v1.2.5
Fix: Completely fix spotweb support...

### v1.2.4
Fix: Help headphones parse Hydra's results
Fix: Indexer connection check used empty API key parameter, preventing check to spotweb to work

### v1.2.3
Fix: Prevent session timeout

### v1.2.2
Note: I've added debug logging to the wrapper for better, well, debugging of problems related to updating. To enable debug logging create a file DEBUG in the data folder and restart the program. As before, any non-docker installations will need to update the wrapper files manually. I'm working on a better solution.
Fix: Adding binsearch/NZBIndex/anizb would fail the connection check
Fix: Periodic check of downloader status was not executed as expected, resulting in incomplete status NZB reports in the history
Fix: Logger sometimes swallowed information when anonymizing data

### v1.2.1
Note: I've changed how some data is kept in the database. Deleting an indexer will remove it completely from the database, also deleting all related stats, search results and downloads. This might take a while on the next startup or whenever you delete an indexer with many related entries
Feature: Option to delete backups after x weeks. 4 is the default
Fix: Improve layout on mobile devices. Thanks nemchik
Fix: Updated the wrapper to delete older JAR files which previously caused some trouble. Any existing installations will have to update this manually. Docker containers must be updated.

### v1.2.0
Feature: Send torrent magnet links to associated program
Fix: Results without recognizable category were rejected

### v1.1.4
Fix: Hide torrent black hole buttons for magnet links
Fix: Torrents were sometimes not correctly downloaded and would have extension .nzb

### v1.1.3
Fix: Fix NZB links not being constructed correctly. Sorry about that

### v1.1.2
Feature: Improved handling of XML generation for newznab/torznab API calls. Should improve compatibility with calling tools
Feature: Hydra attempts to recognize if it's running inside docker. It will not allow you call the internal update mechanism from the main page. You may still call it from the Updates page but a warning will be shown. Let me know if this works
Fix: The URL code change introduced with 1.1.0 might've caused some problems and should be fixed now
Fix: Sending NZBs from the download history to downloaders didn't work. You'll have to manually choose a category because the original category isn't available in the download history anymore
Fix: NZB filenames were not sanitized before being written to ZIP, resulting in an error
Fix: Improved dialog during update installation (no more error messages when everything is fine, hopefully)
Fix: Download history was not filterable by indexer
Fix: SickBeard/-rage/Medusa did not find all relevant categories. I've changed the way Hydra reports itscategories to calling tools. It follows the <a href="http://newznab.readthedocs.io/en/latest/misc/api/#predefined-categories">predefined categories of the newznab standard</a>.

### v1.1.1
Fix: Fix results not being recognized by SickRage
Fix: The URL code change introduced with 1.1.0 might've caused some problems and should be fixed now

### v1.1.0
Feature: Completely rewrote handling of scheme, port, host and context path. Should solve some issues and prevent others from happening where reverse proxies are involved. Also extended the <a href="https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies">Wiki</a>. There's no need to set an external URL anymore. Please report back if this causes any issues
Note: I'll remove the option to send links to downloaders in one of the coming versions. Only upload of NZBs to downloaders will be supported. v2 is capable of handling it without issues and it allows for better control and upload status recognition

### v1.0.18
Fix: Remove test data left in by mistake

### v1.0.17
Feature: Don't require restart for change of log level
Feature: Show status updates during update
Fix: In some cases restarting resulted in shutdown. If you are affected by this you will to manually update the wrapper from this release
Fix: In some cases duplicate detection would throw an exception
Feature: Support JSON output for API searches

### v1.0.16
Fix: Make sure users don't enter an insane download limit value
Fix: Fix forbidden regexes which might've let some results through
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
