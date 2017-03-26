package org.nzbhydra.web;

import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NzbHandling {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandling.class);

    @Autowired
    private SearchResultRepository searchResultRepository;

    @RequestMapping(value = "/internalapi/nzb/{guid}", produces = "application/x-nzb")
    public String search(@PathVariable("guid") long guid) {

        SearchResultEntity result = searchResultRepository.findOne(guid);
        if (result == null) {
            logger.error("NZB download request with invalid/outdated GUID " + guid);
            return "NZB download request with invalid/outdated GUID " + guid;
        }

        return "Download GUID " + guid + " which is " + result.getTitle();
    }
}
