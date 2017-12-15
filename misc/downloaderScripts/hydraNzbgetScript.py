#!/usr/bin/env python
### NZBGET QUEUE/POST-PROCESSING SCRIPT
### QUEUE EVENTS: NZB_ADDED, NZB_DOWNLOADED, NZB_DELETED, URL_COMPLETED


# Updates NZB download status for NZBHydra 2
#
# NOTE: This script requires Python to be installed on your system. You might also need to make the file executable.

##############################################################################
### OPTIONS                                                                ###

#URL of NZBHydra (including URL base, if applicable)
#url=http://127.0.0.1:5076
#apikey=
### NZBGET QUEUE/POST-PROCESSING SCRIPT

import os
import sys
import urllib2

queue_event_type = os.environ.get('NZBNA_EVENT')
if queue_event_type is not None and queue_event_type not in ['NZB_ADDED', 'NZB_DOWNLOADED', 'NZB_DELETED', 'URL_COMPLETED']:
    print 'Unknown event type'
    sys.exit(94)
if not ('NZBNA_EVENT' in os.environ or 'NZBPP_DIRECTORY' in os.environ):
    print('Neither queue script nor PP script, what is going on?')
    sys.exit(94)
base_url = os.environ.get('NZBPO_URL')
if base_url is None:
    print 'Hydra URL not set, using http://127.0.0.1:5076'
    base_url = 'http://127.0.0.1:5076'
pp_status = os.environ.get('NZBPP_TOTALSTATUS')
apikey = os.environ.get('NZBPO_APIKEY')

try:
    nzbget_hydra_status_map = {
        'NZB_ADDED': 'NZB_ADDED',
        'NZB_DOWNLOADED': 'NZB_DOWNLOAD_SUCCESSFUL',
        'NZB_DELETED': 'NZB_ADD_REJECTED',
        'URL_COMPLETED': 'NZB_ADD_ERROR',
        'FAILURE': 'CONTENT_DOWNLOAD_ERROR',
        'WARNING': 'CONTENT_DOWNLOAD_WARNING',
        'SUCCESS': 'CONTENT_DOWNLOAD_SUCCESSFUL'
    }
    if queue_event_type is not None:
        hydra_status = nzbget_hydra_status_map[queue_event_type]
        nzb_name = os.environ.get('NZBPP_NZBFILENAME')
    else:
        hydra_status = nzbget_hydra_status_map[pp_status]
        nzb_name = os.environ.get('NZBPP_NZBFILENAME')
    url = base_url + '/externalapi/nzbstatus/title/' + urllib2.quote(nzb_name) + '/' + hydra_status + "?apikey=" + apikey
    urllib2.urlopen(url).read()
    if pp_status is not None:
        sys.exit(95)

    sys.exit(93)
except Exception as e:
    print "Exception: " + str(e)
    sys.exit(94)
