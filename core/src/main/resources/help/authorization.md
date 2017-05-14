### Auth types
* With auth type "None" all areas are unrestricted.
* With auth type "Form" the basic page is loaded and login is done via a form. 
* With auth type "Basic" you login via basic HTTP authentication. With all areas restricted this is the most secure as 
nearly no data is loaded from the server before you auth.

You can decide for every user if he is allowed to:
* view the search page at all
* view the stats
* access the admin area (config and control)
* view links for downloading NZBs and see their details
* may select which indexers are used for search.

Please note that the last two are purely visual and will not be enforced.