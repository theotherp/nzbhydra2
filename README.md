<img src="https://github.com/theotherp/nzbhydra2/raw/master/core/ui-src/img/banner-bright.png" width="50%"/>

NZBHydra 2 is a meta search for NZB indexers. It provides easy access to a number of raw and newznab based indexers. You can search all your indexers from one place and use it as an indexer source for tools like Sonarr, Radarr or CouchPotato.

It's a complete rewrite of [NZBHydra (1)](https://github.com/theotherp/nzbhydra). It's currently in Beta. It works mostly fine but some functions might not be completely done and incompatibilities with some tools might still exist.

## Major Features

* Searches Anizb, BinSearch, NZBIndex and any newznab compatible indexers. Merges all results, filters them by a number of configurable restrictions, recognizes duplicates and returns them all in one place
* Add results to NZBGet or SABnzbd
* Support for all relevant media IDs (IMDB, TMDB, TVDB, TVRage, TVMaze) and conversion between them
* Query generation, meaning a query will be generated if only a media ID is provided in the search and the indexer doesn't support the ID or if no results were found
* Compatible with Sonarr, Radarr, NZBGet, SABnzbd, nzb360, CouchPotato, Mylar, LL, Sick Beard, Jackett/Cardigann, Watcher, etc.
* Search and download history and extensive stats. E.g. indexer response times, download shares, NZB age, etc.
* Authentication and multi-user support
* Automatic update of NZB download status by querying configured downloaders
* RSS support with configurable cache times
* Torrent support:
  * For GUI searches, allowing you to download torrents to a blackhole folder
  * A separate Torznab compatible endpoint for API requests, allowing you to merge multiple trackers
* Extensive configurability
* Migration of database and settings from v1

See some [screenshots](https://imgur.com/a/ePxwj).

### Major Improvements Over Nzbhydra V1

* Improved performance especially when using many indexers and/or doing multiple searches concurrently. Up to six times faster search times (ignoring indexer response times) and twice as fast result presentation:
  * I wrote a benchmark. 5*3 concurrent API searches took 50 seconds on v1 compared to 4 seconds on v2. 5 subsequent single searches took 15 versus 2 seconds.
  * Stats calculation may be slower, but you don't do that so often
* Display of search progress with update messages and option to cancel searching
* RSS support which will cache the results for a given time
* Proper filtering of displayed results on the search results page
* Extended statistics, e.g. share of downloads / searches per user, age distribution of downloaded NZBs and download failures per indexer
* Query configured downloaders for updates of NZB download content for history and stats
* Extended configurability of categories and improved mapping of categories between Hydra and indexers
* Improved config validation
* Save torrents in a black hole folder; Torznab API endpoint
* Many more QoL improvements, background checks, log outputs, etc.

## How to Run

You need [Java Runtime Environment](https://www.java.com/en/download/manual.jsp) or OpenJDK (both >=8u101 but it won't work with 9.x or higher).

Download the [latest release of NZBHydra 2](https://github.com/theotherp/nzbhydra2/releases) for your platform. Extract it anywhere and start using the appropriate way:
* On Windows (64-bit) you can either start `NZBHydra2.exe` which will add a tray icon (give it some time) or `NZBHydra2 Console.exe` which will open a console window. Note: Do *not* use the folders `C:\Program Files` or `C:\Program Files (x86)`.
* On Linux start `nzbhydra2` (currently working only on x64)
* On Mac: No executable yet, see next point
* If you cannot run the executables for some reason, there's another way (the executables are just compiled Java):
  * Download [nzbhydra2wrapper.py](https://raw.githubusercontent.com/theotherp/nzbhydra2/master/other/wrapper/nzbhydra2wrapper.py), put it in the NZBHydra folder containing the executables and run it; or
  * Alternatively you can use Docker. You might want to use [binhex's container](https://hub.docker.com/r/binhex/arch-nzbhydra2/) or the one by popular maintainers [LinuxServer.io](https://github.com/linuxserver/docker-hydra2).

After a while your browser should open to http://127.0.0.1:5076.

The Java executable is expected to be in the PATH. If it's not and you can't/won't put it there then you need to provide the full path using the `--java` paramater.

If you get SSL errors when contacting indexers please update your Java runtime.

### Install as a Service

Please see the [wiki](https://github.com/theotherp/nzbhydra2/wiki/Windows-service-and-Linux-start-scripts).

### A Note on Memory

The memory usage mainly depends on the database size which depends on the amount of indexers you use, how long you've been running NZBHydra and how many queries are done.

"Normal" sized installations with five indexers should run great with the default memory settings. With a big history and a dozen or more indexers you may need to increase
the memory usage (see main config), especially for calculating stats.

### Disclaimer

This is still in early development. Don't run in on the machine where the nuclear launch codes are stored.

## Development and how you can help

Generally testing and any bug reports are very welcome.

The backend is written in Java and uses Spring Boot with an H2 file database. Maven is used for dependency management and build. 

Project structure:
* `core`: The main code for the project
* `other`: contains artifacts not needed during runtime and a proxy-patched version of SocksLib
* `releases`: is self explanatory
* `shared`: is shared code between modules
* `tests`: contains integration tests

The frontend uses AngularJS 1.x, Bower for dependency management and gulp for build.

If you plan on doing any frontend work (JS, CSS, HTML): Please contact me first and don't just create a PR for changes on the merged CSS / JS files.

Please send merge requests to the develop branch!

## Why Java?

Although I don't think I need to justify myself I expect a lot of negativity because of my decision to go with Java. While it's not as cool as python it allows me to develop the best version
of Hydra. I develop Java by day and I know it best. There's a lot of stuff I wouldn't have been able to do in version 1 - not because it cannot be done with python but because I just don't
know it as well. I'm convinced v2 of Hydra is a huge improvement over v1 and reason enough to use Java.  
While Hydra 2 does use more memory than Hydra 1 it's still comparable to what Sonarr or Radarr use. It's also way faster than v1.

## Contact

Send me an email at TheOtherP@gmx.de or a PM at https://www.reddit.com/user/TheOtherP

## Donate

If you like to help me with any running or upcoming costs you're welcome to send Bitcoin via 1LPCUF9eKEXi58nHbxTbJyfxCJkcCXKzvm or Ether via 0xa6C33b4756D24027227C14285AfAeEE9a9738D42

If you'd like to send other coins like Monero, Litecoin, etc. please contact me.  

## Thanks

<img src="https://github.com/theotherp/nzbhydra/raw/gh-pages/images/logo.png" width="60px"/> To Jetbrains for kindly providing me a license for IntelliJ - I can't imagine developing without it

To all testers, bug reporters, donators, all around awesome people; especially judhat2 for beta testing and loads of helpful feedback

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
