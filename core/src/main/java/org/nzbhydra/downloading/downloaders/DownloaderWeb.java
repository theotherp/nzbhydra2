

package org.nzbhydra.downloading.downloaders;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.DuplicateMovieDownloadCheckResponse;
import org.nzbhydra.downloading.DuplicateMovieDownloadService;
import org.nzbhydra.searching.DemoDataProvider;
import org.nzbhydra.searching.DemoModeWeb;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
public class DownloaderWeb {
    private static final Logger logger = LoggerFactory.getLogger(DownloaderWeb.class);

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private DownloaderProvider downloaderProvider;

    @Autowired
    private DownloaderStatusRetrieval downloaderStatusRetrieval;

    @Autowired
    private DemoDataProvider demoDataProvider;

    @Autowired
    private DuplicateMovieDownloadService duplicateMovieDownloadService;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/downloader/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse checkConnection(@RequestBody DownloaderConfig downloaderConfig) {
        return downloaderProvider.checkConnection(downloaderConfig);
    }

    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/downloader/getStatus", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public DownloaderStatus getStatus() {
        return downloaderStatusRetrieval.getStatus();
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/addNzbs", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    public AddNzbsResponse addNzb(@RequestBody AddFilesRequest addNzbsRequest, Principal principal) {
        duplicateMovieDownloadService.logReasonIfEntered(addNzbsRequest, principal);
        if (DemoModeWeb.isDemoModeActive(principal)) {
            logger.info("Demo mode active, returning mock download response");
            return demoDataProvider.generateDownloadResponse(addNzbsRequest);
        }
        Downloader downloader = downloaderProvider.getDownloaderByName(addNzbsRequest.getDownloaderName());
        return downloader.addBySearchResultIds(addNzbsRequest.getSearchResults(), addNzbsRequest.getCategory());
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/checkDuplicateMovieDownload", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    public DuplicateMovieDownloadCheckResponse checkDuplicateMovieDownload(@RequestBody AddFilesRequest addNzbsRequest, Principal principal) {
        if (DemoModeWeb.isDemoModeActive(principal)) {
            return new DuplicateMovieDownloadCheckResponse(false);
        }
        return duplicateMovieDownloadService.checkIfReasonIsRequired(addNzbsRequest, principal);
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/downloader/{downloaderName}/categories", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getCategories(@PathVariable("downloaderName") String downloaderName, Principal principal) {
        if (DemoModeWeb.isDemoModeActive(principal)) {
            logger.info("Demo mode active, returning mock downloader categories");
            return demoDataProvider.generateDownloaderCategories();
        }
        Downloader downloader = downloaderProvider.getDownloaderByName(downloaderName);
        return downloader.getCategories();
    }


}
