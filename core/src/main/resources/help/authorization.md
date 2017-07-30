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

### Notes
* When opening Hydra to the net for optimum security put it behind an auth secured proxy like nginx or apache. You can still use basic auth here and configure
the same users as in the proxy.
* With no users configured auth will be disabled.
* When you disabled "Restrict searching" the main search functionality will be open to all. In most cases you will need to restrict searching, stats and admin and enable at least one user with all rights.