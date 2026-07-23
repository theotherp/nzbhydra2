

package org.nzbhydra.web;

import com.google.common.base.Strings;
import com.google.common.net.UrlEscapers;
import org.nzbhydra.config.ConfigProvider;
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
    public RedirectView details(@PathVariable("guid") long guid) {
        // Details redirects do not create a download observation, so they intentionally keep the legacy result ID format.
        RedirectView redirectView = new RedirectView();
        String url = searchResultRepository.findById(guid).get().getDetails();
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
