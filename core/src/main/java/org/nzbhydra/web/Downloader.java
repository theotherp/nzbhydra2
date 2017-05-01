package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.downloader.DownloaderProvider;
import org.nzbhydra.web.mapping.AddNzbsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
public class Downloader {

    @Autowired
    private DownloaderProvider downloaderProvider;
    @Autowired
    private UsernameOrIpProvider usernameOrIpProvider;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/downloader/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse checkConnection(@RequestBody DownloaderConfig downloaderConfig) {
        return downloaderProvider.checkConnection(downloaderConfig);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/downloader/addNzbs", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse addNzb(@RequestBody AddNzbsRequest addNzbsRequest, HttpServletRequest request) {
        org.nzbhydra.downloader.Downloader downloader = downloaderProvider.getDownloaderByName(addNzbsRequest.getDownloaderName());
        return downloader.addBySearchResultIds(addNzbsRequest.getSearchResultIds(), addNzbsRequest.getCategory(), usernameOrIpProvider.getUsernameOrIpInternal(request));
    }

}
