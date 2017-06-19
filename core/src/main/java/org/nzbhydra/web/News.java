package org.nzbhydra.web;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.Markdown;
import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.news.NewsProvider;
import org.nzbhydra.news.NewsProvider.NewsEntry;
import org.nzbhydra.web.mapping.BootstrappedData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.security.Principal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
public class News {

    private static final Logger logger = LoggerFactory.getLogger(News.class);

    @Autowired
    private UserInfosProvider userInfosProvider;
    @Autowired
    private NewsProvider newsProvider;

    @RequestMapping(value = "/internalapi/news", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public List<NewsEntryForWeb> getAllNews(HttpSession session, HttpServletRequest request, Principal principal) throws IOException {
        BootstrappedData userInfos = userInfosProvider.getUserInfos(principal);
        if (userInfos.getMaySeeAdmin()) {
            logger.debug("Getting all news ");
            return transform(newsProvider.getNews());
        }
        return Collections.emptyList();
    }

    @RequestMapping(value = "/internalapi/news/forcurrentversion", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public List<NewsEntryForWeb> getNewsForCurrentVersionAndAfter(Principal principal) throws IOException {
        BootstrappedData userInfos = userInfosProvider.getUserInfos(principal);
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


    private List<NewsEntryForWeb> transform(List<NewsEntry> entries) {
        List<NewsEntryForWeb> transformedEntries = new ArrayList<>();
        for (NewsEntry entry : entries) {
            transformedEntries.add(new NewsEntryForWeb(entry.getShowForVersion().getAsString(), Markdown.renderMarkdownAsHtml(entry.getNewsAsMarkdown())));
        }
        return transformedEntries;
    }


    @Data
    @AllArgsConstructor
    public static class NewsEntryForWeb {
        private String version;
        private String news;
    }
}
