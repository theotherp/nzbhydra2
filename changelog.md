### v2.5.8

Feature: Recognize when an outdated wrapper is being used and ask the user to update it manually.

Fix: Don't complain about mixed newznab and torznab results when adding Anime Tosho.

Fix: Removed nzbs.org from the presets :-( RIP



### v2.5.7

Feature: Attempt to automatically detect certain problems and inform the user (admin) about it. For now this will only detect OutOfMemory errors which cannot be properly handled when they occur.

Fix: Disable the grouping of TV results by episode when searching for a specific episode. Also show information about the grouping the first time it is used.

Note: The python wrapper nzbhydra2wrapper.py which is the main entry point for the program is now included in the linux release. If you start Hydra using that python file it will be updated automatically although changes will only take effect after the next restart of the main process.

Note: I was asked for a discord channel. This is it: [https://discord.gg/rMywHv](https://discord.gg/rMywHv). I can't promise I'll be the regularly but feel free to join. Some users there and on reddit are always willing to help (thanks, guys!).



### v2.5.6

Fix: Provide a (better) error message when clicking the infos for a show with TVRage ID for which no infos could be found.



### v2.5.5

Feature: Option to log/display hosts instead of IP addresses. I haven't found a proper way of testing this so let me know if it works ;-)



### v2.5.4

Fix: Allow empty movie searches for NZBPlanet which should result in covers being shown.



### v2.5.3

Fix: Update of downloader status failed with newsbin (which claims to be compatible with the sabnzbd API).



### v2.5.2

Fix: Minor downloader status bar related fixes.



### v2.5.1

Feature: Display status of configured downloader on the bottom of the page. This can be disabled in the downloading config. If multiple downloaders are configured the first one is used.

Fix: Toggling the grouping of TV episodes or the display of TV/movie covers will take effect without having to reload the search.



### v2.4.4

Feature: Reduced font size across the board to fit more results / buttons / whatever on the page. Let me know if it's too tiny :-)

Fix: Add 6box and NZBPlanet to list of indexers which do not support TV or movie searches without identifiers.



### v2.4.3

Fix: Make sure that 100 rows are shown when grouping results (either by season/episode or by title).

Fix: Passwords for users were not properly migrated from v1.



### v2.4.2

Fix: As is tradition every feature release (2.4.0) is followed by a couple of bug fix releases... The tv episode sorting should not throw any errors now and actually work properly :-)



### v2.4.1

Fix: Daily episodes (like 04/08) were not parsed correctly, resulting in an error (see 2.4.0 feature).



### v2.4.0

Feature: When searching in the TV categories in the GUI by default the results will be grouped by season & episode instead of by title. This should make it easier to select one result for every episode which is usually what you want. This behavior can be switched off in the display options (do a new search after the switch).

Fix: Minor improvements to colors in bright theme.



### v2.3.22

Feature: Logging marker to log HTTPS related stuff on debug level.

Fix: Removed an SSL related parameter from the wrapper. I already did this months ago but forgot to update the binary for linux. So if you have problems with SSL and are running Hydra on linux (not in docker) you might want to update the binary. This needs to be done manually.



### v2.3.21

Feature: Option to send the mapped category name to downloaders.

Fix: /api/stats/indexers endpoint was accessible without authorization.

Fix: Show unit for average response times in stats (ms).



### v2.3.20

Fix: Revert revert because, as it turns out, it wasn't the libary at fault but the new version just failed to read a file already corrupted.



### v2.3.19

Fix: Revert update of database library as it caused errors on startup in some issues.



### v2.3.18

Fix: Not all API keys were anonymized when creating the debug infos.



### v2.3.17

Feature: Binsearch is knowing for returning a 503 error every now and then. In that case Hydra will retry the search up to two times.

Fix: An indexer not selected due to load limiting was displayed as being disabled in the GUI.

Fix: Reduce frequency of config file being written.



### v2.3.16

Fix: Add database index to improve loading of search history on initial page load.

Fix: Try to prevent config file from being corrupted.



### v2.3.15

Note: I need to make something clear: If Hydra shows you 100 results on the GUI and says that x results are not yet loaded then that means that some results you're looking for may be missing. You will always only get the newest 100 results from any indexer at first. Even if you sort by name then other results which should be somewhere in that list may be 'hidden' because they were not yet retrieved from the indexer.

null: Delay writing of config file so that not too many concurrent writes occur. This should hopefully reduce the risk of file corruption.



### v2.3.14

Fix: Change how SNI verification is disabled so that nzbgeek.info should work with Java 10+.

Fix: Fix NZBIndex parsing. Thanks to BenoitCharret.



### v2.3.13

Feature: Improve HTTP debug logging

Fix: Revert some more SSL related changes. If you still have problems connecting to indexer please manually update the binaries. Unfortunately the update process can't do that.



### v2.3.12

Fix: I don't know if I should laugh or cry, but the last version actually made matters worse as 2.3.11 is unable to connect to GitHub (among others) which disables the built in update function. So if you read this and don't run docker, you'll have to update manually.



### v2.3.11

Fix: Cautiously optimistic that *some* SSL issues have been solved... ;-)

Fix: When implementing the display of covers I managed to mistakenly think that posters and covers are the same. Actually the poster in this context is the uploader but my code used the poster (username) as cover URL. If you've disabled the display of 'posters' in the search results you'll have to disable it again.



### v2.3.10

Fix: Fix another issue with SSL. I should probably pause development until I'm fit of mind enough to do this properly...



### v2.3.9

Fix: Revert SSL changes made in 2.3.7 as Hydra didn't start for some users. I give up.



### v2.3.8

Fix: Updated executable to provide a java flag which should fix SSL related problems introduced with 2.3.7. If you're not running Hydra inside a container you may need to manually update the binary (nzbhydra*.exe or just nzbhydra on linux)



### v2.3.7

Fix: Changed the way SSL certificates are checked. Connection to indexers like NZBGeek or althub should now work as expected. Removed the option 'Disable SNI'.

Fix: Count API hits used for connection and caps checks when calculating hit limits.

Fix: When results are sorted by title the title groups are now sorted by indexer score instead of age, meaning results from the indexer with the highest score are shown when the title group is collapsed.



### v2.3.6

Fix: The audio category was preconfigured to require both mp3 and flac in the results which doesn't make any sense. You might want to remove them in your category config.

Fix: Old downloads were not removed from history even if the option to only keep them for a certain time was set.

Fix: Check cover/poster URLs provided by indexers to catch some invalid URLs.



### v2.3.5

Feature: Show posters for movie results. Can be toggled in the display options.



### v2.3.4

Fix: Move cancel button in dialog shown while searching because you're all too slow to click it.

Fix: Prevent database trace file becoming too large

Fix: Keep less gclog files in the log folder



### v2.3.3

Fix: Connection to hosts like 'sabnzd' would fail



### v2.3.2

Fix: 2.3.1 didn't start for users updating from 2.2.5 to 2.3.1. Fuck this shit



### v2.3.1

Fix: 2.2.5 unfortunately may have caused database corruption in some cases. Hopefully no more... The fix may need some time the first time this new version is started.



### v2.3.0

Feature: Java 11 is now supported. This required an update of the internal framework which might have some unforseen side effects (bugs), especially regarding authentification and handling of reverse proxies. Let me know if something doesn't work as expected.

Feature: Rename searching option 'Ignore temporarily disabled' to 'Ignore temporary errors'. If enabled indexers will not be temporarily disabled at all if a recoverable error occurs.

Fix: Opening magnet links under Windows 7 doesn't require administrator rights anymore.



### v2.2.5

Fix: In some cases (with really big databases) the check of the API hit limit could take very long. This was hopefully improved. Migration to this version might take a bit for such instances.



### v2.2.4

Feature: Add indexer specific limit to caps check. Background: RARBG only allows one request every two seconds so the caps check, which until now used two concurrent threads and a delay of 1 second, would result in errors. The limits are hard coded. Hydra will not attempt to do any rate limiting for regular search requests.



### v2.2.3

Feature: Include database metadata in debug infos



### v2.2.2

Feature: Minor improvements to performance logging



### v2.2.1

Feature: Improve logging of unparseable indexer responses



### v2.2.0

Note: This release brings some major changes regarding categories and the handling of newznab categories. Please let me know if it breaks anything or has unexpected side effects (or if you love what I've done ;-))

Feature: Allow combinations of newznab categories which must all be found in a search result for that category to be applied. For example 4090&11000 will only match items with both 4090 and 11000. This should allow for even finer category tuning with trackers accessed via Jackett.

Feature: Replace newznab categories incoming API searches with newznab categories of mapped category. For example when you have 2040,2050 configured for Movies HD and a search comes in using 2040 then indexers will be queried using 2040,2050. Until now only the supplied category was used (2040 in the example). This should result in more results to be found and so far I can't tell if it will return just better results or more crap. You can disable this with the 'Transform newznab categories' setting in the searching config.

Feature: Related to above: The categories on the caps page are created from the configured categories. To keep this clean only one newznab category will be used for every category (e.g. Movies HD using 2040,2050 will only be included once with 2040 as ID.

Fix: Use dereferer for NZB details site



### v2.1.7

Fix: Fix/improve category mapping introduced in 2.1.6. Use custom newznab categories if none from the predefined range are provided.



### v2.1.6

Fix: When uploading a backup file the UI didn't update to inform the user about the progress after the file was uploaded.

Fix: Improve category mapping for (torznab) indexers. Some use custom newznab category numbers (>9999) which could not be properly mapped to preconfigured categories.



### v2.1.5

Fix: Improve handling of movie and tv searches with some indexers (see v2.0.23). I just wish all indexers could work the same... :-/

Fix: Prevent indexers without caps from being caps checked (NZBIndex, Binsearch)

Fix: Improve wording indexer state when disabled by the system due to an error from which it cannot recover automatically



### v2.1.4

Feature: Allow retrieval of history and stats via API. See https://github.com/theotherp/nzbhydra2/wiki/External-API,-RSS-and-cached-queries

Fix: Repeat of searches from history sometimes used wrong parameters

Fix: Added nzbs.org to list of indexers unable to process type searches without IDs



### v2.1.3

Fix: Removed dead indexers from presets

Fix: Prevent exception related to duplicate TV infos in database



### v2.1.2

Fix: Indexer added as newznab indexer even when selected as torznab in the config GUI



### v2.1.1

Fix: Validate config to prevent indexers with duplicate names

Fix: Validate config to prevent torznab indexers being added as newznab indexer and vice versa



### v2.1.0

Fix: Search query was not built properly when conversion of search IDs did not provide any IDs usable by an indexer

Feature: Support API caps in JSON



### v2.0.24

Note: Added NZBGeek to the list mentioned in v2.0.23. Thanks to the user letting me know about it.



### v2.0.23

Note: Previously when an API call with search type 'movie' or 'tvsearch' was made without any identifiers or category I would call indexers with search type 'search' instead because some indexers don't like that. This causes some other problems so I've reverted that behavior except for a certain list of indexers. I have hardcoded list of indexers for which the switch will be done. I'm not sure which indexers actually behave that way. So if you find an indexer where browsing the movie or TV releases (e.g. using NZB360) will return a lot of crap please let me know so I can add the indexer to the list.

Note: I've changed the java runtime that is used in the docker container maintained by me (although I actually don't want to really support that...). In my tests it nearly halved memory usage in some scenarios (199MB compared to 380MB). If this proves to be stable I'll recommend the other maintainers to use this as well.



### v2.0.22

Fix: Upload of large ZIP files for restoration was disabled



### v2.0.21

Feature: Some users have reported corrupted config files. I can't explain how that could ever happen but I've added code that tries to recognize this on startuppu and attempts to repair it automatically

Fix: New instances were not properly initialized, in some instances resulting in a crash on startup. Sorry about that



### v2.0.20

Feature: Make sure existing configuration or database is not loaded by an older version of a program than it was created with



### v2.0.19

Fix: Restoration from uploaded backup file wouldn't work



### v2.0.18

Fix: Details link was hidden even if not restricted by auth config

Fix: Redirects to torrent magnet links are now recognized and properly handled

Fix: Downloads of NZBs with spaces in the filename are now properly handled

Fix: Suffix NZBs sent to sabnzbd with .nzb to increase compatibility with newsbin



### v2.0.17

Feature: Automatic update. This feature has been requested for ages. Ironically, now that I rarely release new versions I've finally implemented it. It's opt-in for now even though the update process has been really stable for a while. Now that the startup is faster Hydra shouldn't be unavailable during the update process for more than 20 seconds or so. Any tools calling during that time should recover fine.

Fix: Make sure to load resources from TVMaze using HTTPS

Fix: Handle (invalid) spaces in URLs



### v2.0.16

Fix: Size tag was not forwarded from torznab results



### v2.0.15

Fix: ID lookup for TV shows didn't always work



### v2.0.14

Note: The URL base has to start with a / from now on. Configs without URL base will be migrated

Fix: ID based TV search from GUI would sometimes ignore ID



### v2.0.13

Feature: Warn when changing the host to an invalid IP

Fix: api.althub.co.za should hopefully actually work now



### v2.0.12

Fix: SSL error when accessing althub from docker. Should be fixed with the setting to use the packaged cacerts file enabled

Fix: Detection and handling of required restart after changing config was broken



### v2.0.11

Feature: Allow to disable SSL verification only for certain hosts

Feature: Warn when host is changed from 0.0.0.0 and run in docker. This seems to cause some problems



### v2.0.10

Fix: Sometimes search IDs would be used even if the indexer wasn't configured to use them, resulting in failing searches



### v2.0.9

Fix: Caps check with Jackett indexers wouldn't complete properly due to a change in their code



### v2.0.8

Fix: Adapt database to store long torrent magnet links



### v2.0.7

Fix: Sabnzbd API key was not migrated



### v2.0.6

Fix: Torznab queries were limited to 100 results. I've removed the limit altogether. As torznab doesn't require or support paging there's no reason for a request limit



### v2.0.5

Fix: Adding to downloader via result button would always show failed (introduced with 2.0.3)



### v2.0.4

Fix: Improved feedback when adding NZBs to downloader failed



### v2.0.3

Fix: In some cases an incorrect NZB URL was used for downloads

Fix: Saving the config would sometimes show confusing or wrong warnings

Fix: Restoring from web UI had no effect

Fix: Category mapping would sometimes not work for incoming searches



### v2.0.2

Fix: Minor stability improvements



### v2.0.1

Fix: New installations would generate a faulty default configuration, resulting in failed searches



### v2.0.0

Feature: NZBHydra 2 can now run with Java 8, 9 or 10. It shouldn't matter much which version you use as long as it's up to date. If you want to use 9 or 10 you'll need to manually update the wrapper (i.e. the executable(s) in the main folder)

Feature: Reduced startup time. My instance starts in 8 seconds instead of 22 but YRMV

Feature: I updated the underlying libraries and main framework. This doesn't change much for you except that NZBHydra 2 is a bit more future proof and may have some new bugs :-)

Feature: Added an option to keep the history (searches, downloads, stats) only for a certain time (see Searching options). This may reduce the database size and stats calculation time and may improve performance a bit.

Fix: Hydra will correctly recognize if run in the windows program files folder

Fix: When shutting down or restarting Hydra will try to defrag the database file. In some cases this should drastically reduce the database size. It may grow again but for now I don't have a better fix than restarting the instance...

Fix: Remove multiple trailing words from titles if found



### v1.5.2

Fix: Adding new categories resulted in an exception

Note: Increased the default XMX value to 256



### v1.5.1

Fix: Adding of downloaders to config was broken with last version



### v1.5.0

Feature: Redesigned the button to add new indexers. Inspired by Sonarr

Feature: When a torrent black hole is configured magnet links will be saved as files there. Let me know if you need a switch to disable that. Thanks to wh0cares

Fix: Config validation was not executed properly, sometimes allowing invalid values or even preventing the config from being changed

Note: Added a small note to the readme that "linux" releases mean any platform but windows. Renaming the releases would break updates for running instances



### v1.4.18

Fix: Previous version was missing readme.md which resulted in broken updates



### v1.4.16

Fix: Small error in API? help from last version



### v1.4.15

Feature: Support animetosho (both newznab and torznab)

Feature: Add small 'API?' button in config to display newznab and torznab endpoints and the api key



### v1.4.14

Fix: Error with TMDB IDs introduced with last version

Note: In some cases long running instances of Hydra use a lot of CPU when they should be idle. I've made some changes which should reduce the problem to a degree. Please let me know at https://github.com/theotherp/nzbhydra2/issues/96 if you have similar problems or, even better, if they've gone away with this version



### v1.4.13

Fix: Conversion of IMDB to TMDB ID failed with missing tt prefix



### v1.4.12

Fix: Prevent database error when ignoring too many updates...



### v1.4.11

Fix: Prevent rare database error when converting between movie IDs

Fix: Prevent API keys from leaking in debug infos ZIP when included in last error property



### v1.4.10

Feature: Option to disable download status updates. *Might* help in some rare cases where CPU usage is high when NZBHydra2 is supposed to idle



### v1.4.9

Fix: Log levels for console and file were not honored properly.



### v1.4.8

Note: Updated the wrapper to create a memory dump file if the main process crashes when it's out of memory. As before you need to update the wrapper manually (except when you use docker and don't use the internal update mechanism). This is not strictly necessary but will improve chances of me debugging memory problems.



### v1.4.7

Fix: Bug in internal logic would throw exception and cause indexers to be disabled for no reason

Fix: API hit limit reached on omg would disable indexer permanently

Fix: Indexer config state would change when switching config tabs

Fix: Indexer priority field was not displayed in config



### v1.4.6

Feature: Prepend words in the results filter box with ! to exclude them

Fix: Shift-click for selecting multiple results in a row didn't work on firefox



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

