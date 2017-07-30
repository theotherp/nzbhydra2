Hydra comes with a list of preconfigured search engines (like Anizb or Binsearch for raw searches).

Most of you will want to use your newznab indexers here. The first time an indexer is added the connection is tested. When successful the supported 
search IDs and types are checked. These determine if indexers allow searching for movies, shows or ebooks using meta data like the IMDB id or the author 
and title. Newznab indexers cannot be used until this check was completed.

The priority determines which indexer is used if duplicate results are found. The result from the indexer with the highest priority number is shown first in 
the GUI and returned for API searches.

You can define a hit limit for an indexer. When the maximum number of API hits is reached the indexer isn't used anymore. Either define the time of day when
the counter is reset by the indexer or leave it empty to use a rolling reset counter, meaning the number of hits for the last 24 at the time of the search is 
limited.

You can also define a download limit. When the download limit is reached the indexer will not be searched anymore until the hit reset time is reached (see 
above). Note: Hydra will not prevent downloading NZBs even when the hit limit is reached to prevent tools from disabling Hydra. 

For indexers with a low API hit limit you can enable load limiting. Define any number *n* so that the indexer will only be used for searches in 1/*n* cases 
(on average). For example if you define a load limit of *5* the indexer will only be picked every fifth search.