<img src="https://github.com/theotherp/nzbhydra2/raw/master/core/ui-src/img/banner-bright.png" width="50%"/>

NZBHydra 2 is a meta search for newznab indexers and torznab trackers. It provides easy access to newznab indexers and many torznab trackers via Jackett. You can search all your indexers and trackers from one place and use it as an indexer source for tools like Sonarr, Radarr, Lidarr or CouchPotato.

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
* Save torrents in a black hole folder; Torznab API endpoint
* Migration of database and settings from v1

See some [screenshots](https://imgur.com/a/ePxwj).

Honest recommendation: If you don't understand what any or most of that means this might not be for you. The program is designed to be very configurable and can be a bit intimidating at first. If you're just starting with usenet and its automation tools you might want to wait a bit until you use this. That being said, although there are a lot of options you'll likely never need most of them. I (the developer) use only half of the stuff that NZBHydra can do.

## How to Run

If you don't have an up-to-date Java installation install [OpenJDK](https://adoptopenjdk.net/?variant=openjdk8&jvmVariant=openj9) (the JRE will suffice).

Download the [latest release of NZBHydra 2](https://github.com/theotherp/nzbhydra2/releases/latest) for your platform ("linux" is any platform but windows). Extract it anywhere and start using the appropriate way:
* On Windows (64-bit) you can either start `NZBHydra2.exe` which will add a tray icon (give it some time) or `NZBHydra2 Console.exe` which will open a console window. Note: Do *not* use the folders `C:\Program Files` or `C:\Program Files (x86)`.
* On Linux start `nzbhydra2` (currently working only on x64). You myd need to `chmod +x` it first. 
* On Mac: No executable yet, see next point
* If you cannot run the executables for some reason, there's another way (the executables are just compiled Java):
  * Download [nzbhydra2wrapper.py](https://raw.githubusercontent.com/theotherp/nzbhydra2/master/other/wrapper/nzbhydra2wrapper.py) or [nzbhydra2wrapperPy3.py](https://raw.githubusercontent.com/theotherp/nzbhydra2/master/other/wrapper/nzbhydra2wrapperPy3.py), put it in the NZBHydra folder containing the executables and run it with Python 2.7 or Python 3.5+, respectively.
  * Or you can use...
* Docker. You might want to use [binhex's container](https://hub.docker.com/r/binhex/arch-nzbhydra2/) or the one by popular maintainers [LinuxServer.io](https://github.com/linuxserver/docker-nzbhydra2).

After a while your browser should open to http://127.0.0.1:5076.

The Java executable is expected to be in the PATH. If it's not and you can't/won't put it there then you need to provide the full path using the `--java` paramater.

If you get SSL errors when contacting indexers please update your Java runtime.

### Install as a Service

Please see the [wiki](https://github.com/theotherp/nzbhydra2/wiki/Windows-service-and-Linux-start-scripts).

### Stuff you should know
* Without a "proper" indexer that supports media ID based searches (anything unlike Binsearch, NZBINdex, Anizb, etc) automation tools like Sonarr or Radarr will not work properly
* Hydra queries indexers for the latest 100 results for a given search query and aggregates them on the GUI. That means that even if you sort the results by, say, the name then older results not yet loaded may be missing. You will never know if a certain result is available unless you click the "Load more / Load all" buttons. This may require many API hits and take some time. I recommend using queries that are specific enough to return less than 100 results.

### A Note on Memory

The memory usage mainly depends on the database size which depends on the amount of indexers you use, how long you've been running NZBHydra and how many queries are done.

"Normal" sized installations with five indexers should run great with the default memory settings. With a big history and a dozen or more indexers you may need to increase
the memory usage (see main config), especially for calculating stats.

### Disclaimer

Bugs may/do exist. Don't run it on the machine where the nuclear launch codes are stored.

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


## Contact

Send me an email at TheOtherP@gmx.de or a PM at https://www.reddit.com/user/TheOtherP

## Donate

You're welcome to donate:
  <ul>
    <li>Bitcoin via 1LPCUF9eKEXi58nHbxTbJyfxCJkcCXKzvm</li>
    <li>Regular money via PayPal to theotherp@gmx.de</li>
    <li>Via <a href="https://github.com/sponsors/theotherp">GitHub sponsors</a> which involves a recurring donation similar to Patreon.</li>
  </ul>

## Thanks

<img src="https://github.com/theotherp/nzbhydra/raw/gh-pages/images/logo.png" width="60px"/> To Jetbrains for kindly providing me a license for IntelliJ - I can't imagine developing without it
<br>
<img src="https://www.ej-technologies.com/images/product_banners/jprofiler_small.png"/> To ej-technologies for providing me a license for their great java profiler [JProfiler](https://www.ej-technologies.com/products/jprofiler/overview.html)
<br>
To all testers, bug reporters, donators, all around awesome people; especially judhat2 for beta testing and loads of helpful feedback. Thanks to all the folk on reddit for helping out.

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
