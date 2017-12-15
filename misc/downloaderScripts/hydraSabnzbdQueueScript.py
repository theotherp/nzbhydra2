#!/usr/bin/env python
import sys
import urllib2

# ATTENTION Change your base URL to hydra here if necessary
base_url = 'http://127.0.0.1:5076'
# You shouldn't need to change anything beyond that
# ATTENTION Insert correct API key here
apikey = ''

try:
    (scriptname, nzbname, postprocflags, category, script, prio, downloadsize, grouplist, showname, season, episodenumber, episodename) = sys.argv
    downloadsize = int(downloadsize)
except:
    sys.exit(1)

try:
    url = base_url + '/externalapi/nzbstatus/title/' + urllib2.quote(nzbname) + '/NZB_ADDED' +  "?apikey=" + apikey
    urllib2.urlopen(url).read()
    sys.exit(1)
except Exception as e:
    print "Exception: " + str(e)
    sys.exit(1)
