#!/usr/bin/env python
import os
import sys
import urllib2

# ATTENTION Change your base URL to hydra here if necessary
base_url = 'http://127.0.0.1:5076'
# ATTENTION Insert correct API key here
apikey = ''
# You shouldn't need to change anything beyond that

try:
    pp_status = 'CONTENT_DOWNLOAD_SUCCESSFUL' if os.environ['SAB_PP_STATUS'] == '0' else 'CONTENT_DOWNLOAD_ERROR'
    url = base_url + '/externalapi/nzbstatus/id/' + os.environ['SAB_NZO_ID'] + '/title/' + urllib2.quote(os.environ['SAB_FILENAME']) + '/' + pp_status +  "?apikey=" + apikey
    urllib2.urlopen(url).read()
    sys.exit(1)
except Exception as e:
    print "Exception: " + str(e)
    sys.exit(1)
