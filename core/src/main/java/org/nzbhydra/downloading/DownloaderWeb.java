package org.nzbhydra.downloading;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.downloading.Downloader.AddNzbsResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class DownloaderWeb {

    @Autowired
    private DownloaderProvider downloaderProvider;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/downloader/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse checkConnection(@RequestBody DownloaderConfig downloaderConfig) {
        return downloaderProvider.checkConnection(downloaderConfig);
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/addNzbs", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    public AddNzbsResponse addNzb(@RequestBody AddNzbsRequest addNzbsRequest) {
        org.nzbhydra.downloading.Downloader downloader = downloaderProvider.getDownloaderByName(addNzbsRequest.getDownloaderName());
        return downloader.addBySearchResultIds(addNzbsRequest.getSearchResults(), addNzbsRequest.getCategory());
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/{downloaderName}/categories", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getCategories(@PathVariable("downloaderName") String downloaderName) {
        org.nzbhydra.downloading.Downloader downloader = downloaderProvider.getDownloaderByName(downloaderName);
        return downloader.getCategories();
    }



}
