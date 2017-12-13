# NZBHydra 2 
[![CircleCI](https://circleci.com/gh/theotherp/nzbhydra2.svg?style=svg&circle-token=20568f733a8f77b2f168d7d6f463aa198951949a)](https://circleci.com/gh/theotherp/nzbhydra2) [![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/theotherp/nzbhydra2.svg)](http://isitmaintained.com/project/theotherp/nzbhydra2 "Average time to resolve an issue") [![Percentage of issues still open](http://isitmaintained.com/badge/open/theotherp/nzbhydra2.svg)](http://isitmaintained.com/project/theotherp/nzbhydra2 "Percentage of issues still open")
NZBHydra 2 is a meta search for NZB indexers. It provides easy access to a number of raw and newznab based indexers. You can search all your indexers from one place and use it as indexer source for tools like Sonarr or CouchPotato.

It's a complete rewrite of [NZBHydra (1)](https://github.com/theotherp/nzbhydra). It's currently in Alpha. 

## Major features
* Searches Anizb, BinSearch, NzbIndex and any newznab compatible indexers. Merges all results, filters them by a number of configurable restrictions, recognizes duplicates and returns them all in one place
* Add results to nzbget or sabnzbd
* Support for all relevant media IDs (IMDB, TMDB, TVDB, TVRage, TVMaze) and conversion between them
* Query generation, meaning a query will be generated if only a media ID is provided in the search and the indexer doesn't support the ID or if no results were found
* Compatible with Sonarr, Radarr, nzbget, sabnzbd, NZB 360, CouchPotato, Mylar, LL, Sickbeard, Jackett/Cardigann, Watcher, etc.
* Search and download history and extensive stats, e.g. indexer response times, download shares, NZB age, etc.
* Authentication and multi-user support
* RSS support with configurable cache times
* Torrent support:
  * For GUI searches, allowing you to download torrents to a blackhole folder
  * A separate TORZNAB compatible endpoint for API requests, allowing you to merge multiple trackers
* Extensive configurability

[Screenshots](https://imgur.com/a/ePxwj)  

### Major improvements over NZBHydra v1
* Improved performance especially when using many indexers and/or doing multiple searches concurrently. Up to six times faster search times (ignoring indexer response times):
  * I wrote a benchmark. 5*3 concurrent searches took v1 50 seconds while v2 only took 4 seconds. 5 subsequent single searches took 15 versus 2 seconds.
  * Stats calculation is slower, but you don't do that so often 
* Display of search progress with update messages and option to cancel searching
* RSS support which will cache the results for a given time
* Proper filtering of displayed results on the search results page
* Extended statistics, e.g. share of downloads / searches per user, age distribution of downloaded NZBs and download failures per indexer
* Downloader scripts to inform Hydra about the actual download result of an NZB
* Extended configurability of categories and improved mapping of categories between Hydra and indexers
* Improved config validation
* Save torrents in a black hole folder; tornab API endpoint
* Many more QoL improvements, background checks, log outputs, etc.


## How to run
You need [Java Runtime Environment (>=8u101)](https://www.java.com/de/download/manual.jsp) or OpenJDK.<sup>Don't complain about Java. You can still use [python based NZBHydra 1](https://github.com/theotherp/nzbhydra) if you really want.</sup> 


Download the [latest release of NZBHydra2](https://github.com/theotherp/nzbhydra2/releases) for your platform. Extract it anywhere and start using the appropriate way:
* On windows you can either start "NZBHydra2.exe" which will add a tray icon or "NZBHydra2 Console.exe" which will open a console window.
* On linux start "nzbhydra2"
* On Mac: No idea, I don't have one. If you have found out please tell me.

After a while your browser should open to http://127.0.0.1:5076

Alternatively you can use a docker container:
docker run -p <localport>:5076 -v <localdatafolder>:/data -v <localtorrentsfolder>:/torrents theotherp/nzbhydra2 TODO:Register and verify

The java executable is expected to be in the PATH. If it's not and you can't/won't put it there you need to provide the full path via <tt>--java</tt> paramater

If you get SSL errors when contacting indexers make please update your java runtime.

#### A note on memory
The memory usage mainly depends on the database size which depends on the amount of indexers you use, how long you've been running NZBHydra and how many queries are done. 
"Normal" sized installations with five indexers should run great with the default memory settings. With a big history and a dozen or more indexers you may need to increase
the memory usage (see main config), especially for calculating stats. 

### Install as a service
Please see the [wiki](https://github.com/theotherp/nzbhydra2/wiki/Windows-service-and-Linux-start-scripts)

## Disclaimer
This is still in early development. Don't run in on the machine where the nuclear launch codes are stored.

## Development and how you can help
Generally testing and any bug reports are very welcome.

I haven't been able to get the wrapper to run in docker. If you have found a way or want to help please let me know.

If you plan on doing any frontend work (JS, CSS, HTML): Please contact me first and don't just create a PR for changes on the merged CSS / JS files.

Please send merge requests to the develop branch!

## Why Java?
Although I don't think I need to justify myself I expect a lot of negativity because of my decision to go with Java. While it's not as cool as python it allows me to develop the best version
of Hydra. I develop Java by day and I know it best. There's a lot of stuff I wouldn't have been able to do in version 1 - not because it cannot be done with python but because I just don't
know it as well. I'm convinced v2 of Hydra is a huge improvement over v1 and reason enough to use Java.  
While Hydra 2 does use more memory than Hydra 1 it's still comparable to what Sonarr or Radarr use. It's also way faster than v1.

## Contact ###
Send me an email at TheOtherP@gmx.de or a PM at https://www.reddit.com/user/TheOtherP

## Donate ###
If you like to help me with any running or upcoming costs you're welcome to send Bitcoin via 1LPCUF9eKEXi58nHbxTbJyfxCJkcCXKzvm or Ether via 0xa6C33b4756D24027227C14285AfAeEE9a9738D42

If you'd like to send other coins like Monero, LiteCoin, etc. please contact me. 

## Thanks ###
<img src="https://github.com/theotherp/nzbhydra/raw/gh-pages/images/logo.png" width="60px"/> To Jetbrains for kindly providing me a license for IntelliJ - I can't imagine developing without it

To all testers, bug reporters, donators, all around awesome people

## License ###
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0