

package org.nzbhydra.web;

import com.google.common.base.Strings;
import com.google.common.net.UrlEscapers;
import org.apache.commons.lang3.ObjectUtils;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.DownloadIdentifier;
import org.nzbhydra.downloading.InvalidSearchResultIdException;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Optional;

@Controller
public class NzbDetailsWeb {

    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private ConfigProvider configProvider;

    private static final Logger logger = LoggerFactory.getLogger(NzbDetailsWeb.class);

    @Secured({"ROLE_USER"})
    @GetMapping("/details/{guid}")
    public RedirectView details(@PathVariable("guid") String guid) throws InvalidSearchResultIdException {
        long searchResultId = DownloadIdentifier.parse(guid, true).searchResultId();
        RedirectView redirectView = new RedirectView();
        Optional<SearchResultEntity> resultEntity = searchResultRepository.findByHash(searchResultId);
        if (resultEntity.isEmpty()) {
            throw new InvalidSearchResultIdException(searchResultId, true);
        }
        SearchResultEntity searchResultEntity = resultEntity.get();
        String url = ObjectUtils.firstNonNull(searchResultEntity.getDetails(), searchResultEntity.getLink());
        if (url == null) {
            throw new InvalidSearchResultIdException(searchResultId, true);
        }
        Optional<String> derefererOptional = configProvider.getBaseConfig().getMain().getDereferer();
        if (derefererOptional.isPresent() && !Strings.isNullOrEmpty(derefererOptional.get())) {
            url = derefererOptional.get()
                    .replace("$s", UrlEscapers.urlFragmentEscaper().escape(url)
                            .replace("$us", url));
        }
        redirectView.setUrl(url);
        logger.debug("Redirecting to {} for GUID {}", url, guid);
        return redirectView;
    }

}
