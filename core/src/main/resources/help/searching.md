### Indexer access
By default if access to an indexer fails the indexer is disabled for a certain amount of time (for a short while first, then 
increasingly longer if the problems persist). You can select to disable this and always try these indexers.

Some indexers provide information if a release is passworded. If you select to ignore these releases only those will be ignored 
of which I know for sure that they're actually passworded.

Raw search engines like Binsearch don't support searches based on IDs (e.g. for a movie using an IMDB id). You can enable query
generation for these. Hydra will then try to retrieve the movie's or show's title and generate a query, for example "showname s01e01".
 
In some cases an ID based search will not provide any results. You can enable a fallback so that in such a case the search will be 
repeated with a query using the title of the show or movie.  
 
Some indexers don't seem to like Hydra and disable access based on the user agent. You can change it here if you want. Please leave 
it as it is if you have no problems. This allows indexers to gather better statistics on how their API services are used.

### Forbidden and required words
You can provide a list of forbidden and required words. These will be applied to every search, internal or external. One forbidden 
word in a result title dismisses the result. If none of the required words is found anywhere in a result title it's also dismissed. 
You can define forbidden and required words for categories in the next tab.
Usually required or forbidden words are applied on a word base, so they must word a complete word in a title. Only if they contain a 
dash or a dot they may appear anywhere in the title. Example: "ea" matches "something.from.ea" but not "release.from.other". "web-dl" 
matches "title.web-dl" and "someweb-dl".

### Result processing
Hydra tries to find duplicate results from different indexers using heuristics. You can control some parameters for that but usually 
the default values work quite well. You can decide if you want to remove found duplicates from API search results or leave that to the 
tool. Usually tools do not expect to find duplicates in search results so you should leave this enabled.
 
NZB downloads from Hydra can either be achieved by redirecting the requester to the original indexer or by downloading the NZB from the 
indexer and serving this. Redirecting has the advantage that it causes the least load on Hydra but also the disadvantage that the requester 
might be forwarded to an indexer link that contains the indexer's API key. To prevent that select to proxy NZBs.

By default all found results are stored in the database for 7 days until they're deleted. After that any links to Hydra results still 
stored elsewhere become invalid. You can increase the limit if you want, the disc space needed is negligible (about 75 MB for 7 days on 
my server):