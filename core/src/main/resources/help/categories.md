Hydra contains a preset range of minimum and maximum sizes for its categories. When you select a category in the search area 
the appropriate fields are filled with these values. You can disable this if you want.

### Category specific settings
This is some more advanced stuff and most of you will never need to use this. You can delete and add and configure any of the categories.

You can define required and forbidden words for every category. You can then decide if these restrictions should be applied to 
internal searches only, to API searches only, always, or never. 
This allows you, for example, to configure black or white lists for tools that don't contain that feature themselves. 
See the online help for Searching for more information on how these restrictions are applied.

Hydra tries to map API search (newnzab) categories to its internal list of categories, going from specific to general. 
Example: If an API search is done with a catagory that matches those of "Movies HD" the settings for that category are used. 
Otherwise it checks if it matches the "Movies" category and, if yes, uses that one. If that one doesn't match no category settings are used.
 
Related to that you must also define the newznab categories for every Hydra category, e.g. decide if the category for foreign 
movies (2010) is used for movie searches. This also controls the category mapping described above.

Note: When an API search defines categories the internal mapping is only used for the forbidden and required words. The search 
requests to your newznab indexers will still use the categories from the original request, not the ones configured here.
 
If you want you can entirely ignore results from categories. Results from these categories will not show in the searches. If you select 
"Internal" or "Always" this category will also not be selectable on the search page.