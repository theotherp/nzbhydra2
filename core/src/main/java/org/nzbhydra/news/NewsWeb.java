package org.nzbhydra.news;

import jakarta.servlet.http.HttpSession;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.ExceptionInfo;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.Markdown;
import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.news.NewsProvider.NewsEntry;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.web.BootstrappedDataTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;

import java.io.IOException;
import java.security.Principal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
public class NewsWeb {

    private static final Logger logger = LoggerFactory.getLogger(NewsWeb.class);

    @Autowired
    private UserInfosProvider userInfosProvider;
    @Autowired
    private NewsProvider newsProvider;
    @Autowired
    private UpdateManager updateManager;

    @RequestMapping(value = "/internalapi/news", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public List<NewsEntryForWeb> getAllNews(HttpSession session, Principal principal) throws IOException {
        BootstrappedDataTO userInfos = userInfosProvider.getUserInfos(principal);
        if (userInfos.getMaySeeAdmin()) {
            logger.debug("Getting all news ");
            return transform(newsProvider.getNews());
        }
        return Collections.emptyList();
    }

    @RequestMapping(value = "/internalapi/news/forcurrentversion", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public List<NewsEntryForWeb> getNewsForCurrentVersionAndAfter(Principal principal) throws IOException {
        BootstrappedDataTO userInfos = userInfosProvider.getUserInfos(principal);
        if (!userInfos.getMaySeeAdmin()) {
            return Collections.emptyList();
        }
        return transform(newsProvider.getNewsForCurrentVersionAndAfter());
    }

    @RequestMapping(value = "/internalapi/news/saveshown", method = RequestMethod.PUT)
    @Secured({"ROLE_USER"})
    public GenericResponse saveShown() throws IOException {
        newsProvider.saveShownForCurrentVersion();
        return GenericResponse.ok();
    }

    @ExceptionHandler(value = {IOException.class})
    protected ResponseEntity<ExceptionInfo> handleNewsException(IOException ex, WebRequest request) {
        String error = "An error occurred while getting news: " + ex.getMessage();
        logger.error(error, ex);
        return new ResponseEntity<>(new ExceptionInfo(500, error, ex.getClass().getName(), error, request.getContextPath()), HttpStatus.valueOf(500));
    }


    private List<NewsEntryForWeb> transform(List<NewsEntry> entries) {
        List<NewsEntryForWeb> transformedEntries = new ArrayList<>();
        for (NewsEntry entry : entries) {
            boolean isForCurrentVersion = entry.getShowForVersion().equals(new SemanticVersion(updateManager.getCurrentVersionString()));
            boolean isForNewerVersion = entry.getShowForVersion().isUpdateFor(new SemanticVersion(updateManager.getCurrentVersionString()));
            transformedEntries.add(new NewsEntryForWeb(entry.getShowForVersion().getAsString(), Markdown.renderMarkdownAsHtml(entry.getNewsAsMarkdown()), isForCurrentVersion, isForNewerVersion));
        }
        return transformedEntries;
    }


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class NewsEntryForWeb {
        private String version;
        private String news;
        private boolean forCurrentVersion;
        private boolean forNewerVersion;
    }
}
