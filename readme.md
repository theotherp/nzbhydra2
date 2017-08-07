NZBHydra 2 is a meta search for NZB indexers. It provides easy access to a number of raw and newznab based indexers. You can search all your indexers from one place and use it as indexer source for tools like Sonarr or CouchPotato.

It's a complete rewrite of [NZBHydra (1)](https://github.com/theotherp/nzbhydra). It's currently in Alpha. 

##Major features
* Searches Anizb, BinSearch, NzbIndex and any newznab compatible indexers. Merges all results, filters them by a number of configurable restrictions, recognizes duplicates and returns them all in one place
* Add results to nzbget or sabnzbd
* Support for all relevant media IDs (IMDB, TMDB, TVDB, TVRage, TVMaze) and conversion between them
* Query generation, meaning a query will be generated if only a media ID is provided in the search and the indexer doesn't support the ID or if no results were found
* Compatible with Sonarr, Radarr, nzbget, sabnzbd, NZB 360, CouchPotato, Mylar, LL, Sickbeard, Jackett/Cardigann, Watcher, etc.
* Search and download history and extensive stats, e.g. indexer response times, download shares, NZB age, etc.
* Authentication and multi-user support
* Torrent support:
  * For GUI searches, allowing you to download torrents to a blackhole folder
  * As separate TORZNAB compatible endpoint for API requests, allowing you to merge multiple trackers
* Extensive configurability  

##Screenshots
TODO

##How to run
You need [Java Runtime Environment (>=8)](https://www.java.com/de/download/manual.jsp).<sup>Don't complain about Java. You can still use [python based NZBHydra 1](https://github.com/theotherp/nzbhydra) if you really want.</sup>

Download the latest release of NZBHydra 2 (TODO add link) for your platform. Extract it anywhere and start using the appropriate way. After a while your browser should open to http://127.0.0.1:5076

Alternatively you can use a docker container TODO add links

## Install as a service
TODO: Add wiki entries and link here

## Disclaimer
This is still in early development. Don't run in on the machine where the nuclear launch codes are stored.

## Development and how you can help
Generally testing and any bug reports are very welcome.

I haven't been able to get the wrapper to run in docker. If you have found a way or want to help please let me know.

If you plan on doing any frontend work (JS, CSS, HTML): Please contact me first and don't just create a PR for changes on the merged CSS / JS files.

Please send merge requests to the develop branch!

## Why Java?
While I don't think I need to justify myself I expect a lot of negativity because of my decision to go with Java. While it's not as cool as python it allows me to develop the bestion version
of Hydra. I develop Java by day and I know it best. There's a lot of stuff I wouldn't have been able to do in version 1 - not because it cannot be done with python but because I just don't
know it less well. Yes, it takes more memory. Yes, it nags you about updates (which you should absolutely do!). Still, I'm convinces v2 of Hydra is a huge improvement over v1. And 90% of
users won't ever care about what programming language it's written in. 

## Contact ###
Send me an email at TheOtherP@gmx.de or a PM at https://www.reddit.com/user/TheOtherP

## Donate ###
If you like to help me with any running or upcoming costs you're welcome to send money to my bitcoin: 1PnnwWfdyniojCL2kD5ZDBWBuKcFJvrq4t

## Thanks ###
<img src="https://github.com/theotherp/nzbhydra/raw/gh-pages/images/logo.png" width="60px"/> To Jetbrains for kindly providing me a license for IntelliJ - I can't imagine developing without it

To all testers, bug reporters, donators, all around awesome people

## License ###
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0