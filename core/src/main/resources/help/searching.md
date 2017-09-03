### Indexer access
By default if access to an indexer fails the indexer is disabled for a certain amount of time (for a short while first, then 
increasingly longer if the problems persist). You can select to disable this and always try these indexers.

Raw search engines like Binsearch don't support searches based on IDs (e.g. for a movie using an IMDB id). You can enable query
generation for these. Hydra will then try to retrieve the movie's or show's title and generate a query, for example "showname s01e01".
In some cases an ID based search will not provide any results. You can enable a fallback so that in such a case the search will be 
repeated with a query using the title of the show or movie.
 
Some indexers don't seem to like Hydra and disable access based on the user agent. You can change it here if you want. Please leave 
it as it is if you have no problems. This allows indexers to gather better statistics on how their API services are used.

### Result filters
This section allows you to define global filters which will be applied to all search results. You can define words and regexes 
which must or must not be matched for a search result to be matched. You can also exclude certain usenet posters and groups which are known for spamming.

One forbidden word in a result title dismisses the result. If none of the required words is found anywhere in a result title it's also dismissed. 
You can define forbidden and required words for categories in the next tab.
Usually required or forbidden words are applied on a word base, so they must form a complete word in a title. Only if they contain a 
dash or a dot they may appear anywhere in the title. Example: "ea" matches "something.from.ea" but not "release.from.other". "web-dl" 
matches "title.web-dl" and "someweb-dl".


Some indexers provide information if a release is passworded. If you select to ignore these releases only those will be ignored 
of which I know for sure that they're actually passworded.


### Result processing
In (hopefully) rare cases Hydra may crash when processing an API search request. You can enable to return an empty search page in these cases (if Hydra hasn't
crashed altogether ). This means that the calling tool (e.g. Sonarr) will think that the indexer (Hydra) is fine but just didn't return a result. That way Hydra
won't be disabled as indexer but on the downside you may not be directly notified that an error occurred.

Hydra tries to find duplicate results from different indexers using heuristics. You can control some parameters for that but usually the default values work quite well.
 
Hydra contains a predefined list of words which will be removed if a search result title ends with them. This allows better duplicate detection and cleans up the titles.

Hydra attempts to parse the provided newznab category IDs for results and map them to the configured categories. In some cases this may lead to category names
which are not quite correct. You can select to use the original category name used by the indexer. This will only affect which category name is shown in the results.
 
NZB downloads from Hydra can either be achieved by redirecting the requester to the original indexer or by downloading the NZB from the 
indexer and serving this. Redirecting has the advantage that it causes the least load on Hydra but also the disadvantage that the requester 
might be forwarded to an indexer link that contains the indexer's API key. To prevent that select to proxy NZBs.

By default all found results are stored in the database for 14 days until they're deleted. After that any links to Hydra results still 
stored elsewhere become invalid. You can increase the limit if you want, the disc space needed is negligible (about 75 MB for 7 days on 
my server).