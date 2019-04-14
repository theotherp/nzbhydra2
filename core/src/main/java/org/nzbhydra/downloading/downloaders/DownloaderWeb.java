/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading.downloaders;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class DownloaderWeb {

    @Autowired
    private DownloaderProvider downloaderProvider;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/downloader/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse checkConnection(@RequestBody DownloaderConfig downloaderConfig) {
        return downloaderProvider.checkConnection(downloaderConfig);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/downloader/getStatus", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public DownloaderStatus getStatus() throws DownloaderException {
        Collection<Downloader> allDownloaders = downloaderProvider.getAllDownloaders();
        List<Downloader> enabledDownloaders = allDownloaders.stream().filter(Downloader::isEnabled).collect(Collectors.toList());
        if (enabledDownloaders.isEmpty()) {
            return new DownloaderStatus();
        }
        return enabledDownloaders.get(0).getStatus();
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/addNzbs", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    public AddNzbsResponse addNzb(@RequestBody AddFilesRequest addNzbsRequest) {
        Downloader downloader = downloaderProvider.getDownloaderByName(addNzbsRequest.getDownloaderName());
        return downloader.addBySearchResultIds(addNzbsRequest.getSearchResults(), addNzbsRequest.getCategory());
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/{downloaderName}/categories", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getCategories(@PathVariable("downloaderName") String downloaderName) {
        Downloader downloader = downloaderProvider.getDownloaderByName(downloaderName);
        return downloader.getCategories();
    }



}
