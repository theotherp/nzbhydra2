### v5.1.1 (2023-01-23)

**Fix** Due to a change in the framework for some users autocomplete for media searches would show an error and not return results. Even though the fix is easy (reset the website's cache in the browser) I added a fix on my side as it seems to affect more users than I initially thought.

**Fix** For big databases the initial migration may fail because of not enough memory.

**Fix** The linux executables lost their permissions flags when packed so you had to chmod +x them. Now they should be executable by default.



### v5.1.0 (2023-01-22)

**Feature** I thought I couldn't provide an ARM binary but thanks to a hint by thespad I can now build them. So now you'll be able to run NZBHydra without Java on ARM64 machines. You still will need python to run the wrapper because I was unable to compile the wrapper but that should be a minor problem because you couldn't execute it before either...



### v5.0.8 (2023-01-22)

**Fix** Fixed performance logging. In 5.0.6 I disabled it, now it actually works.

**Fix** Never try to update automatically when running docker.

**Fix** Parsing sabnzbd remaining time was broken.



### v5.0.7 (2023-01-22)

**Fix** Alright, so the binary fix from 5.0.6 didn't fix anything but made it worse. But now I've found a way to make the binary run for everybody (I hope, who knows by know).



### v5.0.6 (2023-01-21)

**Fix** NZBHydra wouldn't start with performance logging enabled. So many corner cases...

**Fix** Starting NZBHydra on linux via the nzbhydra executable didn't work and you'd get an error mentioning zlib. For some wild reason I don't understand this was not caused by the actual main binary but by the compiled wrapper. So running NZBHydra via python wrapper worked. I've compiled the wrapper on another machine and it worked. Why? I don't know. Do I give a fuck by now? Nope.



### v5.0.5 (2023-01-21)

**Feature** Include service scripts for windows and linux in generic release

**Feature** The previously compiled binaries did not start on all linux distros. I switched to an older distro to compile the binary so it hopefully is also runnable on older distros.



### v5.0.4 (2023-01-22)

**Fix** With many indexers searching at the same time some accesses would not complete



### v5.0.3 (2023-01-21)

**Fix** Downloader icons were not shown



### v5.0.2 (2023-01-20)

**Fix** Autocomplete pictures and alternative themes were not loaded when using an URL base

**Fix** Outdated wrapper file warning was shown by mistake



### v5.0.1 (2023-01-20)

**Fix** Such a big release and it all went to hell. Due to a last minute change my tests with auth enabled hydra wouldn't start. Sorry for that.



### v5.0.0 BETA

**Feature** Massive upgrade of the underlying framework and used libraries. Java is not needed anymore in most cases. Highly increased startup and memory performance (on my machine using docker and as a fresh install it starts in 0.9 seconds and uses 180MB memory now versus 9 seconds and 332MB memory before). This is the result of weeks of work and testing. I hope everything goes as smooth as possible.

**Feature** Update of database to a newer version. This requires a recreation of the whole database which hopefully will be executed automatically and without errors ;-)

**Feature** Improve startup time by moving some tasks into the background.

**Feature** Improve performance when handling search results and making HTTP calls.

**Feature** Ensure integrity of database when creating backup.

**Feature** Only delete old backups if a newer one exists.

**Fix** Prevent some misleading error messages that were shown when shutting down.



### v4.7.5

**Fix** Configure separate indexers in lidarr using categories. See <a href="https://github.com/theotherp/nzbhydra2/issues/802">#802</a>



### v4.7.4 (2022-12-14)

**Fix** Hopefully make the java update message disappear after a java update. See <a href="https://github.com/theotherp/nzbhydra2/issues/810">#810</a>



### v4.7.3 (2022-12-06)

**Note** A future update will require Java 17. To prepare for that a message will be shown asking you to update your system accordingly. If you're running NZBHydra2 in docker you don't need to do anything.

**Feature** Set the environment variable NZBHYDRA_DISABLE_UPDATE to true to disable the NZBHydra update mechanism (similar as to when it's run inside docker). This can be used by package maintainers. See <a href="https://github.com/theotherp/nzbhydra2/issues/809">#809</a>



### v4.7.2 (2022-11-30)

**Fix** Handle results without date.

**Fix** Fix typo in apprise notification handler.

**Fix** Hopefully fix notification sending test on arch-nzbhydra2. See <a href="https://github.com/theotherp/nzbhydra2/issues/806">#806</a>

**Fix** Fix automatic configuration of Lidarr. See <a href="https://github.com/theotherp/nzbhydra2/issues/802">#802</a>

**Note** As you can see development has slowed down a bit. The reason is kind of a mix of burnout, a new job and some other stuff. I'll try to get most bugs fixed faster and get back to some new features next year.



### v4.7.1 BETA (2022-09-18)

**Feature** Improve display of errors on startup.

**Fix** Properly handle errors that occur during the detection of open ports.



### v4.7.0 BETA (2022-09-18)

**Feature** Use custom mappings to transform indexer result titles. Use this to clean up titles, add season or episode to it or whatever. See <a href="https://github.com/theotherp/nzbhydra2/issues/794">#794</a>

**Fix** Some of you have an instance running which is exposed to the internet, without any authentication method. I previously tried to recognize this by some heuristic which was a bit naive and caused a lot of false positives. NZBHydra will now periodically try to determine your public IP and actually check if the used port is open. This might still not always work (e.g. in when you're running it using a VPN in which case I guess you know what're doing. Ultimately it's up to you to get your shit together.

**Fix** Only warn about settings violating indexers' rules if the indexers are actually enabled.

**Fix** Fix saving config with custom mappings.



### v4.6.1 (2022-08-23)

**Fix** Fix startup error for new instances. Thanks @ cdloh.



### v4.6.0 (2022-08-22)

**Feature** Add option to replace german umlauts and special characters.



### v4.5.0 BETA (2022-07-09)

**Feature** Automatically use NZB access and adding types required by certain indexers. See <a href="https://github.com/theotherp/nzbhydra2/issues/784">#784</a>.

**Feature** Add debug logging for category mapping.



### v4.4.0 (2022-06-26)

**Feature** Add validation to ensure your configuration matches the requirements of a certain indexer.

**Feature** Warn when exposing NZBHydra to the internet via host 0.0.0.0 with no authentication enabled.

**Note** In the same vein I decided to remove the option to ignore warnings when saving the config. You'll just have to live with it or, ideally, fix the things causing the warnings.

**Note** All the above stems from the fact that a lot of people (=idiots) have their NZBHydra (or *arr) instances wide open to the world without any authentication whatsoever. DO NOT DO THAT! People will steal your API keys and possibly get your indexer access disabled or revoked for good. I'm trying to automatically detect that but it's not easy distinguishing valid accesses from fraudulent ones.



### v4.3.3 (2022-06-15)

**Fix** Fix error when using an HTTP proxy without username / password.

**Fix** Use API hit information from indexer request when no download information was provided. In that case calculate the downloads from the history. See <a href="https://github.com/theotherp/nzbhydra2/issues/778">#778</a>

**Fix** Fix API hit and download detection for DogNZB.

**Fix** Add the current API hit to the number of reported API hits in response.

**Fix** Fix name of logging marker "Custom mapping" (was "Config mapping").



### v4.3.2 (2022-06-13)

**Fix** Fix use of groups in custom search request mapping. See <a href="https://github.com/theotherp/nzbhydra2/issues/700">#700</a>

**Fix** Fix download of backup files. See <a href="https://github.com/theotherp/nzbhydra2/issues/772">#772</a>

**Note** The mysterious issues with connections to indexers failing (and perhaps some other issues) were caused by changes in the linuxserver.io image and should be fixed by now.



### v4.3.1 (2022-05-02)

**Note** I removed the OpenAPI docs as for some really weird reason it may have introduced some unexpected bugs when connecting to indexers or even when trying to update the database



### v4.3.0 (2022-04-03)

**Feature** Allow to configure an indexer's API path. See <a href="https://github.com/theotherp/nzbhydra2/issues/766">#766</a>

**Feature** OpenAPI docs are now available under http://127.0.0.1:5061/v3/api-docs/. This will only be interesting for very few (if any) users. Unfortunately I couldn't get the swagger UI working. You'll have to visit http://127.0.0.1:5061/swagger-ui/index.html and paste the api-docs URL.



### v4.2.1 (2022-03-24)

**Note** Added a banner of and link to NewsDemon. Thanks for sponsoring me!

**Fix** The dismiss button for the banner shown after an automatic update has been installed didn't work reliably. See <a href="https://github.com/theotherp/nzbhydra2/issues/737">#737</a>



### v4.2.0 (2022-03-04)

**Feature** Add entry to display options to always show result titles. By default they're hidden when grouping results with the same name. See <a href="https://github.com/theotherp/nzbhydra2/issues/763">#763</a>

**Feature** Add dismiss button to banner shown after an automatic update has been installed. See <a href="https://github.com/theotherp/nzbhydra2/issues/737">#737</a>

**Fix** Use link to comments as detail link for torznab results. For some indexer the details would previously go to the download link. See <a href="https://github.com/theotherp/nzbhydra2/issues/758">#758</a>

**Fix** Only show video related quick filter buttons when searching in a TV or movie category. See <a href="https://github.com/theotherp/nzbhydra2/issues/732">#732</a>

**Note** I'm currently testing a new version of the database library.  This new version may hopefully be a bit more performant, may result in smaller database files (for those suffering from very larg ones) and / or give me options to fine tune how data is compacted (for those where a lot of IO is produced). Unfortunately it means that the old database needs to be migrated which is always a bit hairy. If you're interested in helping me by testing an alpha version please leave me a note in <a href="https://github.com/theotherp/nzbhydra2/issues/764" target="blank">this github Issue</a>.



### v4.1.0 (2022-01-30)

**Feature** Allow certain notifications to be filtered (not shown / being sent). See <a href="https://github.com/theotherp/nzbhydra2/issues/761">#761</a>

**Fix** Change shebang for python 3 wrapper so that it siginifies being a python 3 script.



### v4.0.2 (2022-01-30)

**Fix** Fix automatic configuration of Sonarr v3. See <a href="https://github.com/theotherp/nzbhydra2/issues/753">#753</a>



### v4.0.1 (2022-01-10)

**Fix** Properly read X-Forwarded-For header and original IP.

**Fix** Execute connection check after an indexer's API key has changed.



### v4.0.0 (2022-01-02)

**Feature** Update framework libraries and add support for Java 17.

**Feature** NZBHydra now (hopefully) properly supports indexers that return more than 100 results per API page. When I started developing 8 years ago no indexer I knew of returned more than 100 results, now some return 500 or even 1000. That obviously often tremendously reduces the API hits needed to fill a page or find a certain result. NZBHydra will now request 1000 results (many indexers will still only return 100) per page. The page size of the results returned by NZBHydra is still 100 (if not overwritten in the API request). The amount of API hits made by local programs doesn't matter and the time and performance overhead are negligible. Please note that these changes required some hefty changes in the deeps of the search logic and may have produced some bugs. Let me know if it works as expected.

**Feature** Show assigned colors of indexers in config list.

**Note** Happy new year!



### v3.18.4 (2021-12-11)

**Fix** Update logging library to a newer version due to a security issue. This isn't much of an issue, in my opinion, as I use a different library although this one is used by others. It also only affects JDKs that are older than a year and it's not an issue on docker containers.



### v3.18.3 (2021-12-06)

**Fix** Added nzbgeek to the list of indexers which don't support movie/tvsearch searches without IDs.



### v3.18.2 (2021-12-06)

**Fix** Some indexers do not support movie/tvsearch type queries without IDs but with word based queries (I know of nzbplanet and dognzb). For these indexers the search type is automatically switched to search when no IDs but a word query is given.



### v3.18.1 (2021-12-01)

**Fix** Fix exception when unexpected java version is found. Why the fuck does every JDK have to have its own version format?



### v3.18.0 (2021-11-27)

**Fix** Make sure that when the NZBHydra API is accessed with a duplicate /api in the URL this is not interpreted as wanting to only use an indexer with the name "api".

**Feature** Abort on startup if incompatible Java version is used.



### v3.17.3 (2021-10-05)

**Fix** Ugh, don't ask. I'm glad that releases don't cost anything.



### v3.17.2 (2021-10-05)

**Fix** The "What's new" views were empty. If you want the gritty details: I make a call to the backend /updates/changesSinceUpTo/3.17.1 which is supposed to return all changes between the current version and 3.17.1, in this example. For some stupid reason the backend framework converts the 3.17.1 to 3.17 which means for the running version 3.17.0 the changes between 3.17 and 3.17.0 were shown which are obviously empty.



### v3.17.1 (2021-10-05)

**Fix** Only allow (ZIP) files to be downloaded that were created by NZBHydra. See <a href="https://github.com/theotherp/nzbhydra2/issues/744">#744</a>.

**Fix** Hide button to download results as ZIP if access to indexer results is configured to work via redirect. See <a href="https://github.com/theotherp/nzbhydra2/issues/734">#734</a>.



### v3.17.0 (2021-10-03)

**Feature** Show beta releases in update section even when beta releases are disabled. You won't get notifications and automatic updates will still respect the config but you can then choose to install a beta version without having to switch to the beta branch. See <a href="https://github.com/theotherp/nzbhydra2/issues/730">#730</a>.

**Feature** Show loading spinner while loading more results. See <a href="https://github.com/theotherp/nzbhydra2/issues/729">#729</a>.

**Fix** Fix wrong API path used when configuring Radarr v4. See <a href="https://github.com/theotherp/nzbhydra2/issues/731">#731</a>.

**Fix** Fix display of fixes in version history (the little orange badge shown in the updates section next to this entry).

**Fix** Don't log output of URL calls when status 429 is returned (Too Many Requests).



### v3.16.2 BETA (2021-09-27)

**Fix** Fix missing quotation mark in base config (only used for new installations).



### v3.16.1 BETA (2021-09-27)

**Fix** Roll back release of 3.16.0 because of some problems with form based logins which need some more analysis.



### v3.16.0 BETA (2021-09-25)

**Feature** Add support for Java 16. Please not that there's no reason for you to just willy-nilly update the java major version (e.g. 11 to 16). Newer releases are not automatically better or safer. Installing patches (e.g. Java 11.0.0 to Java 11.0.2 or such) is enough. Java 17 is still not supported.

**Feature** Add "-xpost" to the list of trailing words to remove. See <a href="https://github.com/theotherp/nzbhydra2/issues/717">#717</a>.

**Fix** Make checkboxes and radioboxes grayscale because new browsers show them in weird blue. See <a href="https://github.com/theotherp/nzbhydra2/issues/727">#727</a>.



### v3.15.2 (2021-08-27)

**Fix** Remove dereferer.org from preset config and from any instances still using it. Modern browsers all support the Referrer-Policy header that is set by NZBHydra anyway.



### v3.15.1 (2021-08-05)

**Feature** When configuring an external tool like sonarr and forgetting to provide its URL base in the URL it will return a misleading response. Hydra will now recognize this case and show a helpful message.

**Fix** Fix sorting of search state messages.

**Fix** Log to browser console which quick filters don't match a result. This will help with debugging some issues in this area.



### v3.15.0 (2021-07-10)

**Feature** Debug infos can now be created and directly uploaded to https://ufile.io/ for easier sharing.

**Feature** The tooltip in the search results for the display of rejected, loaded and filtered results now also shows the number of filtered results for each reason (e.g. x results being too small, y results already downloaded).

**Feature** The "Searching... please wait" box now highlights indexer searches that produced results. The messages are also sorted by indexer name and start with the number of results to allow easier reading. See <a href="https://github.com/theotherp/nzbhydra2/issues/696">#696</a>.



### v3.14.2 (2021-05-23)

**Fix** Min and max size API parameters were ignored. See <a href="https://github.com/theotherp/nzbhydra2/issues/705">#705</a>



### v3.14.1 (2021-04-22)

**Feature** Added NZB360, Readarr and Mylar to mapped user agents. Thanks to SAS-1

**Fix** With the option to transform newznab categories enabled if provided categories of an API call could not be mapped to a category they weren't used at all. See <a href="https://github.com/theotherp/nzbhydra2/issues/704">#704</a>.



### v3.14.0 (2021-04-11)

**Feature** Custom mapping for queries and titles. This allows you to customize / change the values used by external tools or returned by metadata providers like TVDB. See <a href="https://github.com/theotherp/nzbhydra2/issues/700">#700</a>.



### v3.13.2 (2021-03-20)

**Fix** Fix connection check for nzbgeek. See <a href="https://github.com/theotherp/nzbhydra2/issues/695">#695</a>.

**Note** Java 16 is not supported. See <a href="https://github.com/theotherp/nzbhydra2/issues/697">#697</a>.



### v3.13.1 (2021-03-10)

**Fix** Fix external configuration of Readarr (0.1.0.520+). See <a href="https://github.com/theotherp/nzbhydra2/issues/693">#693</a>.



### v3.13.0 (2021-02-23)

**Feature** From now on I'll refer to the appropriate GitHub issues in the changelog (if I don't forget it).

**Fix** Improve category detection for MyAnonaMouse. See <a href="https://github.com/theotherp/nzbhydra2/issues/689">#689</a>.

**Fix** Don't crash GUI when result titles are empty. See <a href="https://github.com/theotherp/nzbhydra2/issues/690">#690</a>.

**Fix** Clarify the restrictions section in the auth config. See <a href="https://github.com/theotherp/nzbhydra2/issues/687">#687</a>.



### v3.12.0 (2021-02-13)

**Feature** Add button to send results to black hole from download history. See <a href="https://github.com/theotherp/nzbhydra2/issues/685">#685</a>

**Feature** Add support for custom parameters to be sent to indexers while searching. See <a href="https://github.com/theotherp/nzbhydra2/issues/647">#647</a>

**Fix** Download status bar did not update properly when the downloader was idle after a download. The bar will now be updated until either a new download is started or the bar is properly filled, representing the downloader's idle state. This should hopefully also fix the long-standing issue with the browser tab freezing / crashing after a while.

**Fix** Ensure that threads which send data to the frontend (like notifications or downloader status) are only active when a UI session (=browser tab) is open. Also only send downloader data if it's actually new (instead of e.g. repeatedly sending information that the downloader is idle.

**Fix** Remove code for nzbs.org :-(



### v3.11.4 (2021-02-08)

**Fix** Fix warning "Destroy method on bean..." when shutting down NZBHydra.

**Fix** Fix automatic configuration of Sonarr and Radarr v3.



### v3.11.3 (2021-01-31)

**Fix** Fix an issue where the backup folder was not properly validated when saving the config. Too bad I don't get paid by the update (=bug).



### v3.11.2 (2021-01-31)

**Fix** Fix a websocket issue when using a reverse proxy. Should've tested that better... If you're running NZBHydra behind a reverse proxy please see https://github.com/theotherp/nzbhydra2/issues/683#issuecomment-770444576.



### v3.11.1 (2021-01-31)

**Fix** Introduced a stupid bug in v3.11.0 which prevented all but one particular indexer from being selected. Sorry about that.



### v3.11.0 (2021-01-31)

**Feature** Implemented rate limiting for certain indexers which don't allow more than x hits in x seconds. If you know of such an indexer please let me know as this is hard coded and not configurable.

**Feature** Added option to disable "What's new" button after an automatic update was installed.

**Fix** Validate backup folder when saving config.

**Fix** Allow direct input for indexer color.

**Fix** Fixed an issue where animetosho results would show up as a warning in the log. The indexer contains NZB and/or torrent links combined in one feed. When you made an NZB or torrent search and a result only contained a link for the other type this would be shown as a warning. This message will now only be shown on debug level.

**Fix** Improve the connection check to sabNZBd so that false positives should be reduced (.i.e in NZBHydra connecting successfully to a proxy or other server is not interpreted as successful connection check).



### v3.10.1 (2021-01-28)

**Fix** Fix an issue with hydra using a base URL (e.g. /nzbhydra2).



### v3.10.0 BETA (2021-01-28)

**Feature** Enabled compression for resources sent to the browser. This shouldn't matter on local connections but save bandwidth should you want to use UI on a mobile browser (horrible as it looks).

**Feature** The GUI will now retrieve notifications, the downloader status and search state via WebSocket. This means that the browser keeps a connection to the server open and is only sent data when new data is available (e.g. when the downloader status actually changed). This should result in considerably fewer requests and (negligible) faster UI update times.



### v3.9.2 (2021-01-16)

**Feature** Added some code that allows me to post a link to adapt the logging config and to download the debug infos.

**Feature** Added config switch to add NZBs to downloader paused.

**Fix** Added some more logging and handling of edge cases for API limits.



### v3.9.1 (2021-01-16)

**Fix** Fixed an issue with time zones related to indexer API limits. It may only affect the log output but may also fix some problems with limit detection.



### v3.9.0 (2020-12-28)

**Feature** NZBHydra will now show the search results table even if all results were rejected. This way you can see the reason for the rejections without having to check the log.

**Fix** Show advanced features in downloader config if selected.



### v3.8.1 (2020-12-28)

**Fix** Remove NZBGeek from list of domains for which do disable SNI.

**Fix** Change text for toggle of advanced options in the config to "Advanced hidden" and "Advanced shown".



### v3.8.0 (2020-12-13)

**Feature** Add 'Show advanced' switch to config. I'd already tried to get this working twice - third time's the charm!.

**Feature** Add button to clear color for an indexer.

**Fix** Apply indexer colors to expanded results as well. To mark expanded results they're shown in a darker shade so it's recommended to use indexer colors which not only differ in lightness.



### v3.7.0 BETA (2020-12-13)

**Feature** New display option to hide 'Results as ZIP' button.

**Feature** New option to choose quickfilters that should be preselected.

**Feature** New option to select the primary downloader for which the footer will show the status.

**Fix** Re-add 'No category' to category selection which got lost in 3.5.0.

**Fix** The multiselect widgets in the config will now show the labels of the selected values, not their internal ID.

**Fix** 'Searching...' window was not closed when all found results were being filtered.

**Fix** Don't show the blue loading bar when checking for notifications.

**Fix** Report API errors as JSON instead of XML when appropriate.



### v3.6.0 (2020-12-05)

**Feature** When aborting an indexer search because no ID conversion was possible Hydra will now show a less... serious message. This is an expected problem, not an error.

**Fix** Remove ampersand (&) from titles when searching indexers as they're interpreted specially.



### v3.5.1 (2020-11-15)

**Fix** Fix linux wrapper executable.



### v3.5.0 (2020-11-15)

**Feature** Use (bigger) buttons for downloader category selection.

**Fix** Fix recognition of java version with recet OpenJDK update.



### v3.4.3 (2020-10-31)

**Fix** Fix error that ocurred when notifications without Apprise URLs were sent.



### v3.4.2 (2020-10-29)

**Fix** Fix error that ocurred when notifications without Apprise URLs were sent.



### v3.4.1 (2020-10-25)

**Fix** Fixed external configuration of Radarr and Sonarr V3 (wrt torrents).



### v3.4.0 (2020-10-25)

**Feature** Added age and source variables to download notification.

**Feature** The previously added "Download" notification was only for when a result was grabbed from Hydra. I've aded a notification for download completion, i.e. when the download finishes the download.

**Fix** Fixed external configuration of Radarr and Sonarr V3.



### v3.3.0 (2020-10-22)

**Feature** Added notifications for downloads.

**Fix** The button to send results to the downloader was not displayed in some cases.

**Fix** Apprise notifications sent via CLI containing quotation marks were truncated.



### v3.2.1 (2020-10-21)

**Fix** Prevent startup errors when migrating from certain older versions.



### v3.2.0 (2020-10-20)

**Feature** Allow using Apprise CLI to send notifications instead of Apprise API.

**Fix** Don't require Apprise API URL to end with /notify (will still work if you've already configured it that way).

**Fix** Anonymize notification URLs when writing debug infos.

**Fix** Prevent invalid expiry date setting and fix startup failing due to invalid setting.



### v3.1.0 (2020-10-18)

**Feature** Add button to test notifications.



### v3.0.0 BETA (2020-10-17)

**Feature** NZBHydra now allows to send and show notifications for certain events. You can request events on the <a href="https://github.com/theotherp/nzbhydra2/issues/631" target="blank">Github Issue</a>.

**Fix** Reduced the percentage of correct results an indexer must return for an ID based search for that ID to be determined to be usable for searches. This will hopefully make the caps check recognize more supported IDs without any false positives.

**Fix** Shorten torrent file names exceeding the maximum path length.

**Fix** Query generation was not properly used for indexers which support a certain search type but no IDs.

**Fix** Show a warning when more than 3 logging markers are enabled. Please only enabled them when requested by me. They reduce the performance and produce lots of irritating log output which hurts more than it helps unless I actually need it.



### v2.29.1 (2020-09-12)

**Fix** Use better name for indexer entries added to *arr.

**Fix** Fix issue with indexer names containing special characters when configuring *arr.



### v2.29.0 (2020-09-08)

**Feature** Added support for indexer priority when configuring Sonarr v3 and Radarr v3.

**Feature** Added support for automatic configuration of Readarr.

**Fix** Anonymize API key and URLs when logging *arr requests and responses.



### v2.28.1 (2020-09-08)

**Feature** Added Lidarr and Readarr to list of known user agents.

**Feature** The dialog for the configuration of external tools will now save the input for each tool and restore it the next time you open the dialog for that tool again.

**Feature** Support for indexer VIP expiry date 'Lifetime'. No logic behind it, just so you can enter and see that information.

**Fix** Improve layout of quick filter buttons in search results.



### v2.28.0 (2020-09-03)

**Feature** When using "Add links" to add NZBs to your downloader the links are usually calculated using the URL with which you accessed NZBHydra. This might be a URL that's not accessible by the downloader (e.g. when it's inside a docker container). You can now configure a URL in the downloading config that will be used for these links instead.

**Fix** Don't let the invisible update footer catch clicks meant for the elements behind it.



### v2.27.2 (2020-09-01)

**Fix** Use proper version for Radarr v3 (I used a develop version which returns 10.x).

**Fix** Reduce log output of exceptions.

**Fix** (Hopefully) improve detection of local IP address when binding to 0.0.0.0.



### v2.27.1 (2020-09-01)

**Feature** Support for Radarr v3 (see v2.27.0).



### v2.27.0 BETA (2020-08-31)

**Feature** You can now automatically add NZBHydra as an indexer to Sonarr / Radarr / Lidarr. You can choose to add it as a single entry or one for every configured indexer and if it should be added as newznab and/or torznab indexer.

**Fix** Close search history dropdown in search dialog when it was dragged.

**Fix** Make quick filters case insensitive.



### v2.26.0 (2020-08-24)

**Feature** Drag an entry from the search history to the search input to prefill it with the history entry's values. Then you can adapt them and search.

**Feature** Added quick filters for HEVC and x265. Added an option to always show quick filter buttons (i.e. for any type of search). You can also define custom quick filters.

**Feature** Show number of filtered and number of duplicate results on search results page.

**Fix** Fix layout of search input for movies and shows.

**Fix** Fix download of magnet links to black hole for some trackers.



### v2.25.0 (2020-07-02)

**Feature** When creating debug infos log all changes made to the config.

**Feature** Show dl/ul ratio indicator for torznab results (if not 100%). E.g. when '50%' is shown only half the download's size will be counted towards your ratio. Freelech torrents will be shown as such.



### v2.24.1 (2020-06-29)

**Fix** Generate query for book searches if enabled and book search not supported by indexer.

**Fix** Autofocus search input field (pretty sure that worked at some point).

**Fix** Catch illegal characters in hostname when configuring sabnzbd.



### v2.24.0 BETA (2020-06-22)

**Note** I've upgraded some of the libraries I used. This should ideally not change anything but to be sure I'll release this as prerelase first.

**Fix** Remove API keys in URL encoded log entries.



### v2.23.0 (2020-06-03)

**Feature** Double-click system tray icon to open GUI in browser.

**Feature** Click downloader image in footer to open it in a new tab.

**Feature** Add toggle to display options for search result groups being expanded by default.

**Feature** Add toggle to display options for the indicator of already downloaded results.

**Feature** Add toggle to display options to control display of already downloaded results. It's basically a filter.



### v2.22.5 (2020-05-27)

**Fix** Indexers which report the API and download limits were not properly selected when the hit limit was reached but the latest hit was more than 24 hours ago.

**Fix** Error while searching Animetosho.

**Fix** Properly recognize ID based searches returning too many results.



### v2.22.4 (2020-05-24)

**Fix** Fix problem with torznab introduced in last version (looking at me again, in this case).



### v2.22.3 (2020-05-24)

**Fix** Fix problem with paging introduced in last version (looking at me, in this case).



### v2.22.2 (2020-05-20)

**Feature** Add refresh buttons to search and download history.

**Fix** Properly handle indexers which report more results in an API response than they actually return (looking at you, wtfnzbs).



### v2.22.1 (2020-05-13)

**Fix** Last release was broken a bit...



### v2.22.0 (2020-05-13)

**Feature** Add filter for minimum # of seeders (in general and per tracker).

**Fix** It appears that the hashing algorithm used to check for the outdated wrapper files behaves differently on some machines / OSes. I switched to SHA1 which should reduce false positives. If you still get the wrapper warning and really updated all files let me know.

**Fix** Made sure that torznab results are never considered duplicates to anything. It could be argued that in some cases two torrents from public trackers may actually be the same but I consider that an edge case.



### v2.21.1 (2020-05-09)

**Feature** Make instructions what to update when your wrapper is outdated extra clear: Any wrapper file found in the folder must be updated, not just the one you're using to run hydra. If the message says to extract the ZIP into your nzbhydra folder I mean ALL THE FILES.

**Note** I moved my mail address from theotherp@gmx.de to theotherp@posteo.net.



### v2.21.0 (2020-05-08)

**Feature** NZBHydra will now try to fall back to similar results when an NZB download fails. This is only possible if it proxies the results instead of redirecting to the indexer so I've made that the default *for new installs*. It works by looking for results with the same title from other indexers which were found in the same search as the result of which the download failed.

**Fix** Covers were not shown for search results.

**Fix** Fix layout of tooltip icons ("?") in config in safari browser.



### v2.20.7 (2020-05-07)

**Fix** Execute check of outdated wrapper on startup to properly detect updated wrapper.

**Fix** Fix some more layout issues.



### v2.20.6 (2020-05-07)

**Fix** Revert tool to compile python wrapper to exe to older version as new exe files were (falsely!) recognized as a virus by *some* tools. To be clear, the files were never problematic. That means you'll have update the exe files or python scripts again.

**Fix** Fix decoding issue of settings file by python3 wrapper.



### v2.20.5 (2020-05-06)

**Feature** Mark results in GUI that already have been downloaded.

**Fix** Fix issue with notification about outdated wrapper files not being shown. NZBHydra will now nag you until you refresh the files.

**Fix** Revert layout fixes made in v2.20.4 because fuck CSS.



### v2.20.4 (2020-05-06)

**Feature** GC logging (for debugging of memory issues) is now configurable and disabled by default. This has required a change in the wrapper which means you'll have to manually update them if you're running NZBHydra on windows or are using the linux executable.

**Feature** Show current version and (if applicable) docker container infos on about page.

**Fix** Fix parsing of API limits from indexers' API responses using different formats.

**Fix** Don't show news for fresh installs.

**Fix** Fix some (minor) layout issues on the search page.



### v2.20.3 (2020-05-01)

**Feature** NZBHydra will recognize renamed indexers when saving the config. Renaming will no longer cause loss of stats and history for those indexers. You should have two indexers configured with the same host, API key and search type as this messes with the rename detection.

**Feature** Click covers in search results to show them in a pop-up.

**Fix** In some cases the download history could not be opened.



### v2.20.2 (2020-04-29)

**Feature** Added more substructures to the config GUI to make it a bit more clear.

**Feature** Replaced the config help pop-up pages with contextual help. Click the question marks neach to each field to get a bit more in-depth info.

**Feature** Add button to clear search input.

**Fix** Automatic update notification was also shown for manual updates.



### v2.20.1 (2020-04-28)

**Feature** Add button to debug infos tab to list all HTTP endpoints (useful for reverse proxy config).

**Fix** Search type SEARCH wasn't displayed in indexer config.

**Fix** Improve matching of indexer configs when reading jackett config.

**Fix** Restore display of button to send torrents to black hole.

**Fix** Try to fix circular loading error when creating backup.



### v2.20.0 (2020-04-26)

**Feature** Option to filter out results by language. Very few indexers provide the language in the results, though.

**Feature** You can now add self-signed certificates for any hosts you want to connect to. Just create a folder named 'certificates' inside the data folder, put your .crt files there and reload NZBHydra.

**Feature** Option to disable SSL verification for local hosts. (This was on by default so far).

**Feature** Support for saving NZBs to a black hole.

**Fix** Fix sorting by age in download history.

**Fix** NZBGet connection didn't honor SSL verification settings.

**Fix** Properly display last errror on indexer statuses page.

**Fix** Fix parsing of binsearch date on non-english locales.

**Fix** Properly recognize duplicate NZBs not added to sabNZBd.

**Fix** Improve matching of downloads to downloader entries where no external ID exists, i.e. those downloads resulting from API accesses.

**Fix** When using NZBGet the wrong NZB would be shown as downloading if the first entry in the queue wasn't the one downloading.

**Fix** Handle errors better while adding torrents to black hole or sending magnet links.

**Fix** Filter out quotation marks (") when searching NZBGeek.

**Note** I've added two settings for the database. Just ignore them unless told otherwise ;-)



### v2.19.6 (2020-04-23)

**Fix** With v2.15.0 I added the option to configure the backup folder and changed the path from being relative to the data folder to being relative to the main folder. That's not compatible with docker containers and broke the backup but I always insisted it wasn't my fault - it was, sorry.



### v2.19.5 (2020-04-20)

**Fix** Indexer caps check was not executed when adding a new indexer.

**Note** Happy 420. Stay inside. Stay healthy. Sorry for all the bugfix releases...



### v2.19.4 (2020-04-20)

**Fix** Fix error while reading API limits response from indexers which don't report oldest access time.



### v2.19.3 (2020-04-20)

**Fix** Fix error when searching torznab.



### v2.19.2 (2020-04-20)

**Fix** Fix error related to fallback.



### v2.19.1 (2020-04-20)

**Feature** Add debug output for determination of API/download limits.

**Fix** Corectly parse API/download limit information from NNTmux.



### v2.19.0 BETA (2020-04-19)

**Feature** Add option to set VIP expiry date for an indexer. You will be warned when the expiry date is near or has been reached.



### v2.18.0 BETA (2020-04-19)

**Feature** Added option to define a color for an indexer. Results from that indexer will be marked using that color.

**Fix** Some indexers apparently return all results for ID based searches when actually no results were found. In this case it will be handled as if no results were found.

**Fix** Adjust width of title box in search form when displaying results.

**Fix** Fallback to query generation was often not executed when it should've.



### v2.17.6 (2020-04-17)

**Fix** Fix passworded releases not being included for a certain indexer.

**Note** Added logging to debug query generation fallback.

**Note** Added thank-you to newsgroup.ninja for sponsoring me.



### v2.17.5 (2020-04-05)

**Fix** Fix copy & paste error introduced with last version.



### v2.17.4 (2020-04-05)

**Fix** Min and max size were not filled on page load with a custom default category was configured.



### v2.17.3 (2020-04-01)

**Feature** Add option to always convert media IDs. This might make sense for indexers that only sometimes support a certain ID, i.e. don't have all results tagged with a certain ID but may have tagged them with others.



### v2.17.2 (2020-04-01)

**Fix** Fix database error when searching with disabled history.

**Fix** Don't show option how long to keep stats with disabled history.



### v2.17.1 (2020-03-31)

**Fix** When reading the jackett configuration update existing tracker configs instead of replacing them.

**Note** Enable query generation for internal searches by default.



### v2.17.0 (2020-03-30)

**Feature** Add option to read Jackett config and automatically add all configured trackers. Already configured trackers will be updated. Thanks for Davide Campagna for the tip.

**Feature** Add option to configure downloader to never send a category.

**Fix** Some time ago I implemented a feature that recognized OutOfMemory errors in the log which might've been not recognized by the user because the program automatically restarts after such a crash. Ironically this check caused OutOfMemory errors with huge log files...



### v2.16.5 (2020-03-23)

**Feature** Enable some more logging to debug slow server responses.



### v2.16.3 (2020-03-23)

**Feature** Fancy new graph for CPU usage per thread in the debug infos section. Enable the logging marker 'Performance' for the graph to show data. In this case NZBHydra will also log memory usage and any threads using more than 5% CPU. This might have an overhead on some systems so I don't recommend running it by default.

**Feature** Add option to create and log a thread dump directly from the GUI. You can also create a heap dump for me to analyze but this will only work with non-J9 JREs.

**Feature** Log more data in the debug report. If you're curious you can visit http://127.0.0.1:5076/actuator (or whatever your IP and port are) and take a look. There's a lot of data you could display in a dashboard.



### v2.16.2 (2020-03-22)

**Feature** Extend performance logging.



### v2.16.1 BETA (2020-03-15)

**Fix** Fix display of version history.



### v2.16.0 BETA (2020-03-15)

**Feature** Add an extra option for how long stats data is kept. Set this to 4 weeks or so. I've also updated the wiki's memory page to explain which settings impact the database size which is usually the reason for high memory usage.

**Note** I've reduced the default for how long search results are kept in the database to mitigate some memory issues with large databases. Only very few users should be affected by this negatively.

**Note** I've moved the settings for the history to the main config section.



### v2.15.2 BETA (2020-03-15)

**Feature** Increased the number of entries in the search history dropdown to 25.

**Feature** Added option to configure the number of results shown per page. Default is 100. Max is 500.

**Fix** Properly display full width of selected titles from the search autocomplete.

**Fix** Remove apostrophe (') from generated queries again. Seems like there is no right way to do this as some trackers return more results with and some without; but it also seems that more indexers prefer it to be removed. If you know a tracker / indexer that works better with apostrophes in the query please tell me and I will make an exclusion for them.



### v2.15.1 BETA (2020-03-14)

**Fix** Contents of the generic storage were not properly migrated.



### v2.15.0 BETA (2020-03-14)

**Feature** Option to disable history of searches and downloads.

**Feature** Option to configure folder for backups.

**Feature** Option to not send newznab categories for torznab indexers (trackers). See <a href="https://github.com/theotherp/nzbhydra2/issues/516"><a href="https://github.com/theotherp/nzbhydra2/issues/516">#516</a></a>.

**Note** Previously a couple of settings (Time of last backup, time of first start, latest news shown, etc.) were stored in the database. That meant they were lost when starting with a new database. I've moved the settings to the config file wherey they belong.

**Feature** Show a notification footer when an automatic update was installed.

**Fix** Don't crash py3 wrapper when trying to log unicode characters.

**Fix** Keep result selection when changing pages. (To be precise, the result selection was actually already kept but upon page change "selected" results' checkboxes would not be checked.)

**Fix** Fix download of results as ZIP (which apparently nobody uses as it seems to have been broken forever...).



### v2.14.2 (2020-03-09)

**Fix** Ensure passworded results are included for certain indexers when configured not to ignore them.

**Fix** Fix link to downloading help.



### v2.14.1 (2020-02-23)

**Fix** Fix failing startup of fresh instance on Linux. Thanks, hotio.



### v2.14.0 (2020-02-23)

**Feature** Allow setting a default category to be preselected.

**Feature** Add supported SSL ciphers to debug infos output.

**Feature** Update indexer presets.

**Fix** Fix errors in py3 wrapper.



### v2.13.14 (2020-02-19)

**Fix** Fix error in URL calculation, resulting in failing API downloads when other programs access Hydra via a reverse proxy with SSL.



### v2.13.13 (2020-02-17)

**Fix** Redirect system.out to log file for SSL debug infos even on windows



### v2.13.12 BETA (2020-02-15)

**Fix** Don't use value of X-Forwarded-For when recognizing secure IPs.

**Fix** Don't use search IDs in fallback queries. The indexer already returned 0 results for the last search and providing them may prevent the query from returning results.



### v2.13.11 BETA (2020-02-15)

**Fix** Fix invalid config created by v2.13.9.



### v2.13.10 BETA (2020-02-15)

**Fix** Fix error while saving config.



### v2.13.9 BETA (2020-02-15)

**Feature** Replace auth token implementation with auth header. You may define an header that provides a username and a range of IP addresses from which this header will be accepted. The user will automatically be logged in.



### v2.13.8 BETA (2020-02-15)

**Feature** Allow authorization via predefined OAuth2 / (X-)Authorization header. The token must be unique for each user in order to identify him.

**Fix** Improve matching of downloader history entries.

**Fix** Use dereferer for links in config help texts.

**Fix** Improve readability of error messages in dark and grey themes.



### v2.13.7 (2020-02-11)

**Fix** Further extend logging if logging marker 'HTTP Server' is selected. Don't hide local IP addresses in log. Replace other IP files with hashes to hide them but make them comparable.



### v2.13.6 (2020-02-09)

**Fix** Improve matching of hidden download entries from NZBGet history.



### v2.13.5 (2020-02-09)

**Feature** Extend logging if logging marker 'HTTP Server' is selected.



### v2.13.4 (2020-02-08)

**Fix** Improve wording of config description on how to apply newznab categories by pressing enter.

**Fix** Include hidden results from NZBGet history when checking download status. That way entries removed by *arr and other programs will be considered, too.



### v2.13.3 (2020-02-06)

**Fix** Fixed a very rare issue where a file stored in temp directory could not be read or deleted which prevented successful database migration.



### v2.13.2 (2020-02-02)

**Fix** Uniqueness score was not saved for torrent downloads.

**Fix** Apostrophes were removed from generated queries resulting in less results.



### v2.13.1 (2020-02-01)

**Fix** Don't verify hostnames for hosts for which to ignore SSL certificate checks.



### v2.13.0 BETA (2020-02-01)

**Note** I've removed the option to use the packaged cacerts file which will now always be loaded by default. A future version will allow to add custom certificates to the chain. Most likely this will not affect many users anyway.

**Fix** Fixed issue where SSL verification was not properly disabled for some hosts. Certificate checks are now also automatically disabled for local hosts.



### v2.12.8 BETA (2020-01-29)

**Fix** Same shit, different release. Thanks to reloxx13 for helping me reproduce this.



### v2.12.7 BETA (2020-01-29)

**Fix** Fix another issue with database migration. I'll switch to a different approach soon, this is too fragile.



### v2.12.6 BETA (2020-01-29)

**Fix** Fix issue with new installations not starting due to updated database library. So much for more stability...



### v2.12.5 BETA (2020-01-28)

**Fix** Update database library. Should have no effect on you except hopefully more stability.



### v2.12.4 (2020-01-27)

**Fix** Fix exception that occurs when an indexer's API limit was reached as reported by the indexer but Hydra can't find any of those hits in its database.



### v2.12.3 (2020-01-26)

**Fix** Updated included SSL certificates.

**Fix** Include beta releases in changelog when they have been released between the currently installed final version and the newest final version.



### v2.12.2 (2020-01-20)

**Fix** Made some improvements in the way certificates are loaded. This should hopefully improve connectivity with NZBGeek on systems where it previously failed (due to incorrect JDK installations).



### v2.12.1 BETA (2020-01-19)

**Fix** Fix error in indexer selection when indexers report their API hits but don't report the expiry timestamp.

**Fix** Caching results for external API didn't work with some combination of parameters.



### v2.12.0 BETA (2020-01-18)

**Feature** Show API and download limit related values in the indexer statuses page.

**Feature** If an indexer reports API and download limits and current hits in the response (as far as I know only nntmux does this) this will be stored and used to determine if the indexer's limits are reached. This will allow more precise results when any other programs (or you) happen to make API calls or downloads that Hydra is not aware of. As a fallback the logged API hits and downloads from the database are used (as before).



### v2.11.2 (2020-01-15)

**Fix** Fix SSL logging introduced in v2.11.1 when running in linux.



### v2.11.1 (2020-01-14)

**Feature** Added code to help debug SSL / certificate issues when connecting to indexers.

**Fix** Fix all versions in version history being displayed as beta.

**Fix** Handle unexpected response when checking caps better.



### v2.11.0 (2020-01-12)

**Feature** Restored old "Load all results" behavior. Now when enabled Hydra will display all already retrieved results from the cache. You still need to click "Load all" on the search results page to load all results available from indexers, resulting in more API hits. I've renamed the setting in the config to "Display all cached results".



### v2.10.13 BETA (2020-01-11)

**Feature** Provide wrapper file for Python 3. Would be nice if you could test it and let me know if it works.



### v2.10.12 BETA (2020-01-11)

**Feature** Add validation to category config that warns users when a category contains a newznab main category (like 2000) and a subcategory already covered by that (like 2020).

**Feature** Provide wrapper file for Python 3.

**Fix** Recognize error thrown when search IDs not supported by Animetosho.



### v2.10.11 BETA (2020-01-07)

**Fix** Allow users with access to stats to see the downloader bar. Prevent error message for the others.



### v2.10.10 BETA (2020-01-07)

**Fix** Add missing UI config entry for backup added in last update.



### v2.10.9 BETA (2020-01-06)

**Feature** Switched option for backup to an interval of days which allows you to have a finer control over when backups are created (e.g. more often if your system tends to crash...).



### v2.10.8 (2020-01-05)

**Feature** Added option to update to prereleases. If you enable this you will get 'beta' releases which I consider kinda stable but which contain bigger changes which might still break stuff. If you want to help with development please enable this and report any problems you encounter. Please note that any older instance older than v2.10.8 (this one) will always update to prereleases because they don't know the difference. Docker containers by popular maintainers will soon support prerelease tags (or already do so by now).



### v2.10.7 (2020-01-05)

**Note** Happy new year!

**Fix** Fix memory leak when using a proxy.



### v2.10.6 (2019-12-29)

**Fix** The last changes made a pretty big change in the searching behavior with the option 'Load all' enabled. I'm completely rolling that back until I have an idea how to get what I want without causing excessive search behavior.



### v2.10.5 (2019-12-29)

**Fix** Last udate (which reverted 2.10.3) was incomplete. Sorry, still drowsy from too much christmas food ;-)



### v2.10.4 (2019-12-28)

**Fix** Revert 'load all' change made with last version as it causes some search loops. Will need to take a closer look.



### v2.10.3 (2019-12-28)

**Fix** With the option to load all results enabled now all available results will actually be loaded.

**Note** I've removed the feature to migrate from v1 (to reduce the install size and memory usage a bit). It's still possible to migrate in older versions and then update to a current version.



### v2.10.2 (2019-12-04)

**Feature** Add option to log HTTP server requests and their response times. The log messages will be written to a file nzbhydra.serv.log and not contained in the debug infos. They might help debug some performance related problems.



### v2.10.1 (2019-12-01)

**Fix** Fix db error when trying to save downloaded NZB.



### v2.10.0 (2019-11-30)

**Fix** I've changed (fixed) the way indexers are queried when searches are being made. In essence this will fix paging, allowing Radarr/Sonarr to properly read NZBHydra's results over multiple pages. What does that mean for you? *arr will probably find more results when doing backlog searches and NZBHydra will do more indexer searches, resulting in increased API hits (but not more than if you had configured them directly in *arr). For more (technical) details see <a href="https://github.com/Sonarr/Sonarr/issues/3132">this GitHub issue</a>.

**Fix** Recognize indexers reporting -1 for api or download limit for "unlimited".

**Fix** Fixed a minor layout issue in the config.

**Fix** Make sure "Keep history for ... weeks" is either empty or set to a positive value.

**Fix** The download history didn't load properly when the option to delete old searches from the history was set.



### v2.9.5 (2019-11-23)

**Feature** I realised the indexer score is too complex to show in a chart and replaced it with a table, that shows more information. It will now contain the average uniqueness score, the number of unique downloads and the number of searches which resulted in a download and where an indexer was involved. 



### v2.9.4 (2019-11-21)

**Fix** Further improvements regarding uniqueness score.



### v2.9.3 (2019-11-20)

**Feature** Some indexers report their API and download limits in their XMLs. NZBHydra will detect that when the indexer's caps are checked and will automatically fill out the config accordingly (keeping already set values as they are).



### v2.9.2 (2019-11-17)

**Fix** Actually show version dates in the updates page...



### v2.9.1 (2019-11-17)

**Fix** Further adjustment to uniqueness score.



### v2.9.0 (2019-11-17)

**Feature** I've updated the indexer uniqueness score calculation so that indexers which are often involved in searches get a higher score than those rarely involved. I also found a bug in the way the data was stored to the database so the old values will be removed.

**Feature** The changelog now contains release dates along with the version.

**Feature** Added option to disable update banner when running docker.



### v2.8.4 (2019-11-14)

**Fix** Cached torznab results were returned as wrong XML. Also cached torznab and newznab queries could conflict.



### v2.8.3 (2019-11-14)

**Fix** Improve logging and handling of torznab/newznab XML transformation.



### v2.8.2 (2019-11-13)

**Feature** Support for pourcesoir.in, a french indexer. Their dev approached me with an idea on how to work around laws forbidding hosting NZB files. The indexer provides a certain text for each result using which you will find the result using a raw search engine like binsearch. NZBHydra will display a search icon in the search results GUI via which you can search for the result on Binsearch. I'll be honest, I'm not sure how viable that approach is, but I'm open to new ideas.

**Fix** Fix pagination display error with.



### v2.8.1 (2019-11-11)

**Feature** Allow to define sorting for the search results via URL parameters. Use &sortby=<column> and, optionally, &sortdirection=asc or &sortdirection=desc. This will take preference to the sorting settings saved in a cookie but not overwrite them.



### v2.8.0 (2019-11-08)

**Fix** Hydra will use proper HTTP status codes when NZB download fails to signal that an indexer's API limit is reached. This will be recognized by *arr, which will skip the release and try another one. This will also prevent *arr from disabling NZBHydra in such cases.

**Fix** Fix minor issue in indexer uniqueness score calculation.



### v2.7.7 (2019-11-04)

**Fix** Indexer uniqueness score had wrong axis labels in the stats page.



### v2.7.6 (2019-11-04)

**Feature** Restore the indexer uniqueness score introduced with 2.7.0 and then rolled back due to database migration problems. The database is now restored on startup which should prevent any migration errors. The startup will take a while for this update.



### v2.7.5 (2019-10-30)

**Fix** Fix 'You're not allowed...' error caused by the fix in 2.7.4... :-/



### v2.7.4 (2019-10-29)

**Fix** Fix 'You're not allowed...' error related to security cookie. Thanks to /u/routhinator for the hint.



### v2.7.3 (2019-10-27)

**Feature** Added option to configure cover width in search results.

**Fix** TMDB capabilities were not correctly checked.

**Note** I've added instructions to send one-time donations via PayPal and recurring donations via Github Sponsors.



### v2.7.2 (2019-10-06)

**Fix** I had to revert the changes from 2.7.0 because for some reason some databases could not be migrated. I'll need to take a closer look first, sorry.



### v2.7.1 (2019-10-06)

**Fix** Hopefully fix a problem which might prevent a successful database migration for some instances.



### v2.7.0 (2019-10-06)

**Feature** I've added a new statistics value called "Indexer result uniqueness score" (which is is a mouthful, if you have a better name please let me know). This score attempts to answer the question: Which indexer should I keep and which can I let go? See <a href="https://github.com/theotherp/nzbhydra2/wiki/Indexer-results-uniqueness-score">the wiki for more information</a>. The score will only work for new downloads.



### v2.6.18 (2019-09-29)

**Feature** Add global cache time config parameter



### v2.6.17 (2019-09-07)

**Feature** Allow indexers to be used only for API update queries

**Feature** Allow regular expressions to be used in the search results title filter



### v2.6.16 (2019-09-05)

**Fix** Fix problems with special characters when using autocomplete



### v2.6.15 (2019-09-04)

**Fix** Fix form auth and remember-me cookies



### v2.6.14 (2019-08-12)

**Fix** Minor changes



### v2.6.13 (2019-08-12)

**Fix** Hopefully fix error with CookieTheftException introduced with v2.6.12



### v2.6.12 (2019-08-04)

**Features** Allow limiting the indexers to be used via API. Use "&indexers=<name1>,<name2>".

**Fix** Reduce how long sessions are kept open, possible reducing memory usage in some cases



### v2.6.11 (2019-06-09)

**Fix** Improve handling and performance of wildcards for removal of trailing words

**Fix** Added option to define how long Hydra will try to compress the database file when shutting down. With big databases shutting down may take up to 15 seconds by default. I'm still working on analyzing why some databases grow very large. Until I've found a way to prevent the root cause this option may help a bit but it will still require Hydra to shut down (or restart)



### v2.6.10 (2019-05-21)

**Fix** Changing result selection using "Invert selection" and "Select/deselect all" wasn't properly registered, making mass download buttons unusable

**Fix** Error on startup on headless windows server



### v2.6.9 (2019-05-17)

**Fix** Remove trailing didn't work with words containing "s"... How do you explain stuff to that to non-programmers...

**Fix** USe localhost:8080 as preset sabNZBd URL



### v2.6.8

**Fix** IMDB link in search history was invalid



### v2.6.7 (2019-05-15)

**Fix** Hopefully fix corruption of nzbhydra.yml when machine crashes (or user switches off power deliberately -.-)



### v2.6.6 (2019-05-14)

**Fix** Fix NoClassDefFoundError (only occurred with HTTP logging marker enabled)



### v2.6.5 (2019-05-14)

**Fix** Fix shift-click for selecting multiple results.



### v2.6.4 (2019-05-14)

**Fix** Searches will always use the IDs provided in API calls and not replace them by different IDs provided by IMDB or TVMaze. In very few instances TVMaze had wrong IDs mapped which resulted in wrong searches.

**Fix** Entering domains to bypass when using proxy didn't work.

**Fix** Selecting multiple results in the same title group was not accepted.



### v2.6.3 (2019-05-13)

**Feature** Extended logging for download status updates.

**Feature** Allow wildcards in "Remove trailing..."

**Fix** Disable HSTS security header



### v2.6.2 (2019-05-05)

**Fix** The warning that the wrapper is outdated will be also displayed in the updates section. You can also choose to be reminded again.

**Fix** Update link to Font Awesome in downloader config to the version actually supported.



### v2.6.1 (2019-05-02)

**Feature** Allow indexers to be enabled for all searches but API update searches, i.e. those periodically done by Sonarr and others to get the latest releases.

**Fix** Correctly report torznab caps (taking into regard only torznab indexers). Also disregard any disabled indexers or those not enabled for API searches and include IDs convertible to any of the supported IDs.



### v2.6.0 (2019-05-01)

**Feature** Warn when using config that violates indexer rules and that will result in your API account being disabled.

**Feature** Support IMDB IDs for TV search. This seems to be supported by few indexers but by many trackers.

**Feature** Add option to ignore load limiting for internal searches.

**Feature** Sort indexers in config by state first, then score, then name.

**Fix** NZBHydra used to always report all ID types (e.g. IMDB IDs) in the caps to be supported. Now IDs will only be reported as supported if either at least one configured indexer supports it or query generation is enabled.

**Fix** Prevent log file download from accessing files outside data folder.

**Fix** Parse indexer results with provided passwords correctly (although they don't follow the spec...).



### v2.5.9 (2019-04-27)

**Fix** I used a discord invitation link that expires after one day. Use this one: [https://discord.gg/uh9W3rd](https://discord.gg/uh9W3rd).



### v2.5.8 (2019-04-27)

**Feature** Recognize when an outdated wrapper is being used and ask the user to update it manually.

**Fix** Don't complain about mixed newznab and torznab results when adding Anime Tosho.

**Fix** Removed nzbs.org from the presets :-( RIP



### v2.5.7 (2019-04-27)

**Feature** Attempt to automatically detect certain problems and inform the user (admin) about it. For now this will only detect OutOfMemory errors which cannot be properly handled when they occur.

**Fix** Disable the grouping of TV results by episode when searching for a specific episode. Also show information about the grouping the first time it is used.

**Note** The python wrapper nzbhydra2wrapper.py which is the main entry point for the program is now included in the linux release. If you start Hydra using that python file it will be updated automatically although changes will only take effect after the next restart of the main process.

**Note** I was asked for a discord channel. This is it: [https://discord.gg/uh9W3rd](https://discord.gg/uh9W3rd). I can't promise I'll be the regularly but feel free to join. Some users there and on reddit are always willing to help (thanks, guys!).



### v2.5.6

**Fix** Provide a (better) error message when clicking the infos for a show with TVRage ID for which no infos could be found.



### v2.5.5 (2019-04-17)

**Feature** Option to log/display hosts instead of IP addresses. I haven't found a proper way of testing this so let me know if it works ;-)



### v2.5.4 (2019-04-16)

**Fix** Allow empty movie searches for NZBPlanet which should result in covers being shown.



### v2.5.3 (2019-04-16)

**Fix** Update of downloader status failed with newsbin (which claims to be compatible with the sabnzbd API).



### v2.5.2 (2019-04-15)

**Fix** Minor downloader status bar related fixes.



### v2.5.1 (2019-04-14)

**Feature** Display status of configured downloader on the bottom of the page. This can be disabled in the downloading config. If multiple downloaders are configured the first one is used.

**Fix** Toggling the grouping of TV episodes or the display of TV/movie covers will take effect without having to reload the search.



### v2.4.4 (2019-04-12)

**Feature** Reduced font size across the board to fit more results / buttons / whatever on the page. Let me know if it's too tiny :-)

**Fix** Add 6box and NZBPlanet to list of indexers which do not support TV or movie searches without identifiers.



### v2.4.3 (2019-04-10)

**Fix** Make sure that 100 rows are shown when grouping results (either by season/episode or by title).

**Fix** Passwords for users were not properly migrated from v1.



### v2.4.2 (2019-04-10)

**Fix** As is tradition every feature release (2.4.0) is followed by a couple of bug fix releases... The tv episode sorting should not throw any errors now and actually work properly :-)



### v2.4.1 (2019-04-10)

**Fix** Daily episodes (like 04/08) were not parsed correctly, resulting in an error (see 2.4.0 feature).



### v2.4.0 (2019-04-09)

**Feature** When searching in the TV categories in the GUI by default the results will be grouped by season & episode instead of by title. This should make it easier to select one result for every episode which is usually what you want. This behavior can be switched off in the display options (do a new search after the switch).

**Fix** Minor improvements to colors in bright theme.



### v2.3.22 (2019-04-04)

**Feature** Logging marker to log HTTPS related stuff on debug level.

**Fix** Removed an SSL related parameter from the wrapper. I already did this months ago but forgot to update the binary for linux. So if you have problems with SSL and are running Hydra on linux (not in docker) you might want to update the binary. This needs to be done manually.



### v2.3.21 (2019-03-31)

**Feature** Option to send the mapped category name to downloaders.

**Fix** /api/stats/indexers endpoint was accessible without authorization.

**Fix** Show unit for average response times in stats (ms).



### v2.3.20

**Fix** Revert revert because, as it turns out, it wasn't the libary at fault but the new version just failed to read a file already corrupted.



### v2.3.19 (2019-03-20)

**Fix** Revert update of database library as it caused errors on startup in some issues.



### v2.3.18 (2019-03-18)

**Fix** Not all API keys were anonymized when creating the debug infos.



### v2.3.17 (2019-03-17)

**Feature** Binsearch is knowing for returning a 503 error every now and then. In that case Hydra will retry the search up to two times.

**Fix** An indexer not selected due to load limiting was displayed as being disabled in the GUI.

**Fix** Reduce frequency of config file being written.



### v2.3.16 (2019-03-14)

**Fix** Add database index to improve loading of search history on initial page load.

**Fix** Try to prevent config file from being corrupted.



### v2.3.15 (2019-02-16)

**Note** I need to make something clear: If Hydra shows you 100 results on the GUI and says that x results are not yet loaded then that means that some results you're looking for may be missing. You will always only get the newest 100 results from any indexer at first. Even if you sort by name then other results which should be somewhere in that list may be 'hidden' because they were not yet retrieved from the indexer.

**null** Delay writing of config file so that not too many concurrent writes occur. This should hopefully reduce the risk of file corruption.



### v2.3.14 (2019-02-15)

**Fix** Change how SNI verification is disabled so that nzbgeek.info should work with Java 10+.

**Fix** Fix NZBIndex parsing. Thanks to BenoitCharret.



### v2.3.13 (2019-02-12)

**Feature** Improve HTTP debug logging

**Fix** Revert some more SSL related changes. If you still have problems connecting to indexer please manually update the binaries. Unfortunately the update process can't do that.



### v2.3.12 (2019-02-10)

**Fix** I don't know if I should laugh or cry, but the last version actually made matters worse as 2.3.11 is unable to connect to GitHub (among others) which disables the built in update function. So if you read this and don't run docker, you'll have to update manually.



### v2.3.11 (2019-02-10)

**Fix** Cautiously optimistic that *some* SSL issues have been solved... ;-)

**Fix** When implementing the display of covers I managed to mistakenly think that posters and covers are the same. Actually the poster in this context is the uploader but my code used the poster (username) as cover URL. If you've disabled the display of 'posters' in the search results you'll have to disable it again.



### v2.3.10 (2019-02-09)

**Fix** Fix another issue with SSL. I should probably pause development until I'm fit of mind enough to do this properly...



### v2.3.9 (2019-02-09)

**Fix** Revert SSL changes made in 2.3.7 as Hydra didn't start for some users. I give up.



### v2.3.8 (2019-02-09)

**Fix** Updated executable to provide a java flag which should fix SSL related problems introduced with 2.3.7. If you're not running Hydra inside a container you may need to manually update the binary (nzbhydra*.exe or just nzbhydra on linux)



### v2.3.7 (2019-02-09)

**Fix** Changed the way SSL certificates are checked. Connection to indexers like NZBGeek or althub should now work as expected. Removed the option 'Disable SNI'.

**Fix** Count API hits used for connection and caps checks when calculating hit limits.

**Fix** When results are sorted by title the title groups are now sorted by indexer score instead of age, meaning results from the indexer with the highest score are shown when the title group is collapsed.



### v2.3.6 (2019-02-06)

**Fix** The audio category was preconfigured to require both mp3 and flac in the results which doesn't make any sense. You might want to remove them in your category config.

**Fix** Old downloads were not removed from history even if the option to only keep them for a certain time was set.

**Fix** Check cover/poster URLs provided by indexers to catch some invalid URLs.



### v2.3.5 (2019-02-05)

**Feature** Show posters for movie results. Can be toggled in the display options.



### v2.3.4 (2019-01-31)

**Fix** Move cancel button in dialog shown while searching because you're all too slow to click it.

**Fix** Prevent database trace file becoming too large

**Fix** Keep less gclog files in the log folder



### v2.3.3 (2019-01-28)

**Fix** Connection to hosts like 'sabnzd' would fail



### v2.3.2 (2019-01-27)

**Fix** 2.3.1 didn't start for users updating from 2.2.5 to 2.3.1. Fuck this shit



### v2.3.1 (2019-01-27)

**Fix** 2.2.5 unfortunately may have caused database corruption in some cases. Hopefully no more... The fix may need some time the first time this new version is started.



### v2.3.0 (2019-01-27)

**Feature** Java 11 is now supported. This required an update of the internal framework which might have some unforseen side effects (bugs), especially regarding authentification and handling of reverse proxies. Let me know if something doesn't work as expected.

**Feature** Rename searching option 'Ignore temporarily disabled' to 'Ignore temporary errors'. If enabled indexers will not be temporarily disabled at all if a recoverable error occurs.

**Fix** Opening magnet links under Windows 7 doesn't require administrator rights anymore.



### v2.2.5 (2019-01-26)

**Fix** In some cases (with really big databases) the check of the API hit limit could take very long. This was hopefully improved. Migration to this version might take a bit for such instances.



### v2.2.4 (2019-01-26)

**Feature** Add indexer specific limit to caps check. Background: RARBG only allows one request every two seconds so the caps check, which until now used two concurrent threads and a delay of 1 second, would result in errors. The limits are hard coded. Hydra will not attempt to do any rate limiting for regular search requests.



### v2.2.3 (2019-01-26)

**Feature** Include database metadata in debug infos



### v2.2.2 (2019-01-26)

**Feature** Minor improvements to performance logging



### v2.2.1 (2019-01-21)

**Feature** Improve logging of unparseable indexer responses



### v2.2.0 (2019-01-02)

**Note** This release brings some major changes regarding categories and the handling of newznab categories. Please let me know if it breaks anything or has unexpected side effects (or if you love what I've done ;-))

**Feature** Allow combinations of newznab categories which must all be found in a search result for that category to be applied. For example 4090&11000 will only match items with both 4090 and 11000. This should allow for even finer category tuning with trackers accessed via Jackett.

**Feature** Replace newznab categories incoming API searches with newznab categories of mapped category. For example when you have 2040,2050 configured for Movies HD and a search comes in using 2040 then indexers will be queried using 2040,2050. Until now only the supplied category was used (2040 in the example). This should result in more results to be found and so far I can't tell if it will return just better results or more crap. You can disable this with the 'Transform newznab categories' setting in the searching config.

**Feature** Related to above: The categories on the caps page are created from the configured categories. To keep this clean only one newznab category will be used for every category (e.g. Movies HD using 2040,2050 will only be included once with 2040 as ID.

**Fix** Use dereferer for NZB details site



### v2.1.7 (2018-12-30)

**Fix** Fix/improve category mapping introduced in 2.1.6. Use custom newznab categories if none from the predefined range are provided.



### v2.1.6 (2018-12-30)

**Fix** When uploading a backup file the UI didn't update to inform the user about the progress after the file was uploaded.

**Fix** Improve category mapping for (torznab) indexers. Some use custom newznab category numbers (>9999) which could not be properly mapped to preconfigured categories.



### v2.1.5 (2018-12-29)

**Fix** Improve handling of movie and tv searches with some indexers (see v2.0.23). I just wish all indexers could work the same... :-/

**Fix** Prevent indexers without caps from being caps checked (NZBIndex, Binsearch)

**Fix** Improve wording indexer state when disabled by the system due to an error from which it cannot recover automatically



### v2.1.4 (2018-12-28)

**Feature** Allow retrieval of history and stats via API. See https://github.com/theotherp/nzbhydra2/wiki/External-API,-RSS-and-cached-queries

**Fix** Repeat of searches from history sometimes used wrong parameters

**Fix** Added nzbs.org to list of indexers unable to process type searches without IDs



### v2.1.3 (2018-12-27)

**Fix** Removed dead indexers from presets

**Fix** Prevent exception related to duplicate TV infos in database



### v2.1.2 (2018-12-18)

**Fix** Indexer added as newznab indexer even when selected as torznab in the config GUI



### v2.1.1 (2018-12-18)

**Fix** Validate config to prevent indexers with duplicate names

**Fix** Validate config to prevent torznab indexers being added as newznab indexer and vice versa



### v2.1.0 (2018-12-15)

**Fix** Search query was not built properly when conversion of search IDs did not provide any IDs usable by an indexer

**Feature** Support API caps in JSON



### v2.0.24 (2018-12-14)

**Note** Added NZBGeek to the list mentioned in v2.0.23. Thanks to the user letting me know about it.



### v2.0.23 (2018-12-11)

**Note** Previously when an API call with search type 'movie' or 'tvsearch' was made without any identifiers or category I would call indexers with search type 'search' instead because some indexers don't like that. This causes some other problems so I've reverted that behavior except for a certain list of indexers. I have hardcoded list of indexers for which the switch will be done. I'm not sure which indexers actually behave that way. So if you find an indexer where browsing the movie or TV releases (e.g. using NZB360) will return a lot of crap please let me know so I can add the indexer to the list.

**Note** I've changed the java runtime that is used in the docker container maintained by me (although I actually don't want to really support that...). In my tests it nearly halved memory usage in some scenarios (199MB compared to 380MB). If this proves to be stable I'll recommend the other maintainers to use this as well.



### v2.0.22 (2018-12-09)

**Fix** Upload of large ZIP files for restoration was disabled



### v2.0.21 (2018-12-09)

**Feature** Some users have reported corrupted config files. I can't explain how that could ever happen but I've added code that tries to recognize this on startuppu and attempts to repair it automatically

**Fix** New instances were not properly initialized, in some instances resulting in a crash on startup. Sorry about that



### v2.0.20 (2018-12-08)

**Feature** Make sure existing configuration or database is not loaded by an older version of a program than it was created with



### v2.0.19 (2018-12-08)

**Fix** Restoration from uploaded backup file wouldn't work



### v2.0.18 (2018-12-05)

**Fix** Details link was hidden even if not restricted by auth config

**Fix** Redirects to torrent magnet links are now recognized and properly handled

**Fix** Downloads of NZBs with spaces in the filename are now properly handled

**Fix** Suffix NZBs sent to sabnzbd with .nzb to increase compatibility with newsbin



### v2.0.17 (2018-11-22)

**Feature** Automatic update. This feature has been requested for ages. Ironically, now that I rarely release new versions I've finally implemented it. It's opt-in for now even though the update process has been really stable for a while. Now that the startup is faster Hydra shouldn't be unavailable during the update process for more than 20 seconds or so. Any tools calling during that time should recover fine.

**Fix** Make sure to load resources from TVMaze using HTTPS

**Fix** Handle (invalid) spaces in URLs



### v2.0.16 (2018-11-21)

**Fix** Size tag was not forwarded from torznab results



### v2.0.15 (2018-11-02)

**Fix** ID lookup for TV shows didn't always work



### v2.0.14 (2018-11-02)

**Note** The URL base has to start with a / from now on. Configs without URL base will be migrated

**Fix** ID based TV search from GUI would sometimes ignore ID



### v2.0.13 (2018-10-26)

**Feature** Warn when changing the host to an invalid IP

**Fix** api.althub.co.za should hopefully actually work now



### v2.0.12 (2018-10-24)

**Fix** SSL error when accessing althub from docker. Should be fixed with the setting to use the packaged cacerts file enabled

**Fix** Detection and handling of required restart after changing config was broken



### v2.0.11 (2018-10-23)

**Feature** Allow to disable SSL verification only for certain hosts

**Feature** Warn when host is changed from 0.0.0.0 and run in docker. This seems to cause some problems



### v2.0.10 (2018-10-20)

**Fix** Sometimes search IDs would be used even if the indexer wasn't configured to use them, resulting in failing searches



### v2.0.9 (2018-10-06)

**Fix** Caps check with Jackett indexers wouldn't complete properly due to a change in their code



### v2.0.8 (2018-10-01)

**Fix** Adapt database to store long torrent magnet links



### v2.0.7

**Fix** Sabnzbd API key was not migrated



### v2.0.6 (2018-09-26)

**Fix** Torznab queries were limited to 100 results. I've removed the limit altogether. As torznab doesn't require or support paging there's no reason for a request limit



### v2.0.5 (2018-09-14)

**Fix** Adding to downloader via result button would always show failed (introduced with 2.0.3)



### v2.0.4 (2018-09-13)

**Fix** Improved feedback when adding NZBs to downloader failed



### v2.0.3 (2018-09-05)

**Fix** In some cases an incorrect NZB URL was used for downloads

**Fix** Saving the config would sometimes show confusing or wrong warnings

**Fix** Restoring from web UI had no effect

**Fix** Category mapping would sometimes not work for incoming searches



### v2.0.2

**Fix** Minor stability improvements



### v2.0.1 (2018-08-19)

**Fix** New installations would generate a faulty default configuration, resulting in failed searches



### v2.0.0 (2018-08-18)

**Feature** NZBHydra 2 can now run with Java 8, 9 or 10. It shouldn't matter much which version you use as long as it's up to date. If you want to use 9 or 10 you'll need to manually update the wrapper (i.e. the executable(s) in the main folder)

**Feature** Reduced startup time. My instance starts in 8 seconds instead of 22 but YRMV

**Feature** I updated the underlying libraries and main framework. This doesn't change much for you except that NZBHydra 2 is a bit more future proof and may have some new bugs :-)

**Feature** Added an option to keep the history (searches, downloads, stats) only for a certain time (see Searching options). This may reduce the database size and stats calculation time and may improve performance a bit.

**Fix** Hydra will correctly recognize if run in the windows program files folder

**Fix** When shutting down or restarting Hydra will try to defrag the database file. In some cases this should drastically reduce the database size. It may grow again but for now I don't have a better fix than restarting the instance...

**Fix** Remove multiple trailing words from titles if found



### v1.5.2 (2018-07-31)

**Fix** Adding new categories resulted in an exception

**Note** Increased the default XMX value to 256



### v1.5.1 (2018-06-11)

**Fix** Adding of downloaders to config was broken with last version



### v1.5.0 (2018-06-10)

**Feature** Redesigned the button to add new indexers. Inspired by Sonarr

**Feature** When a torrent black hole is configured magnet links will be saved as files there. Let me know if you need a switch to disable that. Thanks to wh0cares

**Fix** Config validation was not executed properly, sometimes allowing invalid values or even preventing the config from being changed

**Note** Added a small note to the readme that "linux" releases mean any platform but windows. Renaming the releases would break updates for running instances



### v1.4.18 (2018-05-22)

**Fix** Previous version was missing readme.md which resulted in broken updates



### v1.4.16 (2018-05-22)

**Fix** Small error in API? help from last version



### v1.4.15 (2018-05-22)

**Feature** Support animetosho (both newznab and torznab)

**Feature** Add small 'API?' button in config to display newznab and torznab endpoints and the api key



### v1.4.14 (2018-05-21)

**Fix** Error with TMDB IDs introduced with last version

**Note** In some cases long running instances of Hydra use a lot of CPU when they should be idle. I've made some changes which should reduce the problem to a degree. Please let me know at https://github.com/theotherp/nzbhydra2/issues/96 if you have similar problems or, even better, if they've gone away with this version



### v1.4.13 (2018-05-12)

**Fix** Conversion of IMDB to TMDB ID failed with missing tt prefix



### v1.4.12 (2018-05-05)

**Fix** Prevent database error when ignoring too many updates...



### v1.4.11 (2018-05-05)

**Fix** Prevent rare database error when converting between movie IDs

**Fix** Prevent API keys from leaking in debug infos ZIP when included in last error property



### v1.4.10 (2018-05-05)

**Feature** Option to disable download status updates. *Might* help in some rare cases where CPU usage is high when NZBHydra2 is supposed to idle



### v1.4.9

**Fix** Log levels for console and file were not honored properly.



### v1.4.8 (2018-03-17)

**Note** Updated the wrapper to create a memory dump file if the main process crashes when it's out of memory. As before you need to update the wrapper manually (except when you use docker and don't use the internal update mechanism). This is not strictly necessary but will improve chances of me debugging memory problems.



### v1.4.7 (2018-03-14)

**Fix** Bug in internal logic would throw exception and cause indexers to be disabled for no reason

**Fix** API hit limit reached on omg would disable indexer permanently

**Fix** Indexer config state would change when switching config tabs

**Fix** Indexer priority field was not displayed in config



### v1.4.6 (2018-03-08)

**Feature** Prepend words in the results filter box with ! to exclude them

**Fix** Shift-click for selecting multiple results in a row didn't work on firefox



### v1.4.5 (2018-03-05)

**Fix** Improve caps check for some results using a TV show's initialism instead of the full name in the title



### v1.4.4 (2018-02-27)

**Fix** Handle LL searches better that request a general category and a subcategory (e.g. 7000,7020)



### v1.4.3 (2018-02-23)

**Fix** Migration failed because of missing datatabase table



### v1.4.2 (2018-02-17)

**Fix** Allow configuration of basic auth credentials for jackett



### v1.4.1 (2018-02-13)

**Fix** Indexers with incomplete config were shown in selection list but not actually usable

**Fix** Some issues with indexers not beeing reenabled and some confusing messages being shown. The whole thing with indexers being disabled after errors is still a bit wonky

**Fix** Some potential memory leaks



### v1.4.0 (2018-02-10)

**Feature** Rewrote the display of indexer statuses. An indexer's status is now displayed in the indexer config section (where you would probably expect it). The 'Enabled' switch was extended and now will show one of the states 'Enabled', 'Temporarily disabled', 'Permanently disabled' or 'User disabled' and an explanation. THe Indexer statuses view does still show alle the indexers' statuses but is less cluttered

**Feature** Show search results filter box in table header because some users didn't find the filter icons

**Fix** Prevent weird 'Unexpected error in hydra code. Sorry...'



### v1.3.3 (2018-02-08)

**Feature** Improve conversion of newznab categories to internal categories

**Fix** Exception in migration when providing no database file even when migration of database was requested

**Feature** Allow loading of UI files from local folder to allow proper development of UI



### v1.3.2 (2018-02-05)

**Fix** Settings file was sometimes corrupted (wrong charset) and could not be loaded anymore

**Fix** Delete error column in indexer status page when indexer is reenabled

**Fix** Button to browse file system for selecting torrent folder would fail on some systems (e.g. docker)



### v1.3.1 (2018-02-04)

**Feature** Display serious errors on windows in message box

**Fix** Hopefully reduced chance of empty config files being written

**Fix** Handle duplicate results from indexers better (should rarely happen)

**Note** NZBHydra will recognize if it's running on windows and in folder like c:\program files or c:\program files (x86) and refuse to start. Those folders have special read/write rights which might cause some problems. I recommend putting any programs that are not installed by a setup in a "regular" folder



### v1.3.0 (2018-02-03)

**Feature** Experimental feature to use a packaged CA certs file. This probably doesn't concern you but it may solve some SSL related issues with some newer or different JREs

**Fix** Sort indexer download shares by share

**Fix** Made the migration process a tiny bit more robust wrt wrong input

**Fix** Display caps check button for indexers without API key (e.g. spotweb instances). Hide button and search type and ID fields for new indexer. The check is done automatically



### v1.2.6 (2018-02-02)

**Fix** Sabnzbd history could not be properly parsed, preventing download status updates



### v1.2.5 (2018-01-31)

**Fix** Completely fix spotweb support...



### v1.2.4 (2018-01-31)

**Fix** Help headphones parse Hydra's results

**Fix** Indexer connection check used empty API key parameter, preventing check to spotweb to work



### v1.2.3 (2018-01-30)

**Fix** Prevent session timeout



### v1.2.2 (2018-01-29)

**Note** I've added debug logging to the wrapper for better, well, debugging of problems related to updating. To enable debug logging create a file DEBUG in the data folder and restart the program. As before, any non-docker installations will need to update the wrapper files manually. I'm working on a better solution.

**Fix** Adding binsearch/NZBIndex/anizb would fail the connection check

**Fix** Periodic check of downloader status was not executed as expected, resulting in incomplete status NZB reports in the history

**Fix** Logger sometimes swallowed information when anonymizing data



### v1.2.1 (2018-01-27)

**Note** I've changed how some data is kept in the database. Deleting an indexer will remove it completely from the database, also deleting all related stats, search results and downloads. This might take a while on the next startup or whenever you delete an indexer with many related entries

**Feature** Option to delete backups after x weeks. 4 is the default

**Fix** Improve layout on mobile devices. Thanks nemchik

**Fix** Updated the wrapper to delete older JAR files which previously caused some trouble. Any existing installations will have to update this manually. Docker containers must be updated.



### v1.2.0 (2018-01-25)

**Feature** Send torrent magnet links to associated program

**Fix** Results without recognizable category were rejected



### v1.1.4 (2018-01-22)

**Fix** Hide torrent black hole buttons for magnet links

**Fix** Torrents were sometimes not correctly downloaded and would have extension .nzb



### v1.1.3 (2018-01-21)

**Fix** Fix NZB links not being constructed correctly. Sorry about that



### v1.1.2 (2018-01-21)

**Feature** Improved handling of XML generation for newznab/torznab API calls. Should improve compatibility with calling tools

**Feature** Hydra attempts to recognize if it's running inside docker. It will not allow you call the internal update mechanism from the main page. You may still call it from the Updates page but a warning will be shown. Let me know if this works

**Fix** The URL code change introduced with 1.1.0 might've caused some problems and should be fixed now

**Fix** Sending NZBs from the download history to downloaders didn't work. You'll have to manually choose a category because the original category isn't available in the download history anymore

**Fix** NZB filenames were not sanitized before being written to ZIP, resulting in an error

**Fix** Improved dialog during update installation (no more error messages when everything is fine, hopefully)

**Fix** Download history was not filterable by indexer

**Fix** SickBeard/-rage/Medusa did not find all relevant categories. I've changed the way Hydra reports itscategories to calling tools. It follows the <a href="http://newznab.readthedocs.io/en/latest/misc/api/#predefined-categories">predefined categories of the newznab standard</a>.



### v1.1.1 (2018-01-17)

**Fix** Fix results not being recognized by SickRage

**Fix** The URL code change introduced with 1.1.0 might've caused some problems and should be fixed now



### v1.1.0 (2018-01-15)

**Feature** Completely rewrote handling of scheme, port, host and context path. Should solve some issues and prevent others from happening where reverse proxies are involved. Also extended the <a href="https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies">Wiki</a>. There's no need to set an external URL anymore. Please report back if this causes any issues

**Note** I'll remove the option to send links to downloaders in one of the coming versions. Only upload of NZBs to downloaders will be supported. v2 is capable of handling it without issues and it allows for better control and upload status recognition



### v1.0.18 (2018-01-13)

**Fix** Remove test data left in by mistake



### v1.0.17 (2018-01-13)

**Feature** Don't require restart for change of log level

**Feature** Show status updates during update

**Fix** In some cases restarting resulted in shutdown. If you are affected by this you will to manually update the wrapper from this release

**Fix** In some cases duplicate detection would throw an exception

**Feature** Support JSON output for API searches



### v1.0.16 (2018-01-11)

**Fix** Make sure users don't enter an insane download limit value

**Fix** Fix forbidden regexes which might've let some results through

**Feature** Add option to disable CSRF protection and disable it by default



### v1.0.15 (2018-01-10)

**Feature** Pull NZB download status from configured downloaders instead of relying on extension scripts

**Feature** Add button to check caps for all/all incomplete (yellow) indexers

**Fix** Anonymize username:password pairs in URLs in logs

**Fix** Torznab results were returned wrong, preventing Hydra from being added to radarr



### v1.0.14 (2018-01-09)

**Fix** Gracefully shutdown when restarting or quitting while search requests are handled



### v1.0.13 (2018-01-09)

**Fix** NZBs proxied from indexers were returned with wrong / random seeming file name



### v1.0.12 (2018-01-07)

**Feature** Allow migrating only the config, skipping the database migration



### v1.0.11 (2018-01-07)

**Fix** Fix error in auth introduced in a previous version



### v1.0.10 (2018-01-07)

**Feature** Improve the logging for web exceptions (which are often swallowed which makes debugging harder)

**Fix** Name of the category would not update in the category dropdown box on the search page

**Fix** Allow searching without a query in the UI



### v1.0.9 (2018-01-07)

**Fix** Allow NZBHydra2 to be shown in an iFrame (e.g. organizr)



### v1.0.8 (2018-01-06)

**Fix** Increase lengths for columns which may contain very long texts (errors, queries)



### v1.0.7 (2018-01-06)

**Fix** Fix bug in wrapper that I introduced in last version. Oh well...



### v1.0.6 (2018-01-06)

**Note** Improve the way the host is determined. External URL should not need to be set when not using a reverse proxy

**Note** Remove PyYAML dependency from wrapper



### v1.0.5 (2018-01-06)

**Note** Make migration a bit more stable

**Note** Make sure wrapper is started from correct folder



### v1.0.4 (2018-01-06)

**Note** So many fixes



### v1.0.3 (2018-01-06)

**Note** So many fixes



### v1.0.2 (2018-01-06)

**Note** First public release. Welcome!

