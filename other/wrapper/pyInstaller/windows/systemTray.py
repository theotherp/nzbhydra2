#   (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
import os.path
import requests as requests
import webbrowser
from PIL import Image
from pystray import Icon as icon, Menu as menu, MenuItem as item
from threading import Thread

import nzbhydra2wrapperPy3


def openBrowser():
    webbrowser.open(nzbhydra2wrapperPy3.uri)


def shutdown():
    if nzbhydra2wrapperPy3.uri is not None:
        shutdownUrl = (nzbhydra2wrapperPy3.uri + "/internalapi/control/shutdown").replace("//internalapi", "/internalapi")
        result = requests.get(shutdownUrl, params={'internalApiKey': nzbhydra2wrapperPy3.internalApiKey})
        if result.status_code != 200:
            nzbhydra2wrapperPy3.process.terminate()
        stop()
    elif nzbhydra2wrapperPy3.process is not None:
        nzbhydra2wrapperPy3.process.terminate()
        stop()
    else:
        stop()


def restart():
    requests.get(nzbhydra2wrapperPy3.uri + "internalapi/control/restart", params={'internalApiKey': nzbhydra2wrapperPy3.internalApiKey})


bundleDir = os.path.abspath(os.path.dirname(__file__))
imagePath = os.path.join(bundleDir, 'nzbhydra.ico')
definition = icon('test', Image.open(imagePath),
                  menu=menu(
                      item('Open web UI', openBrowser),
                      item('Restart', restart),
                      item('Shutdown', shutdown)
                  ))


def start():
    thread = Thread(target=definition.run)
    thread.start()
    return thread


def stop():
    definition.stop()
