package org.nzbhydra.news;

import jakarta.servlet.http.HttpSession;
import org.nzbhydra.ExceptionInfo;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.Markdown;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.news.NewsProvider.NewsEntry;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;

import java.io.IOException;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class NewsWeb {

    private static final Logger logger = LoggerFactory.getLogger(NewsWeb.class);

    @Autowired
    private NewsProvider newsProvider;
    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private UserNewsProvider userNewsProvider;

    @GetMapping("/internalapi/news")
    @Secured({"ROLE_USER"})
    public List<NewsEntryForWeb> getAllNews(HttpSession session, Principal principal) throws IOException {
            logger.debug("Getting all news ");
            return transform(newsProvider.getNews());
    }

    @GetMapping("/internalapi/news/forcurrentversion")
    @Secured({"ROLE_USER"})
    public List<NewsEntryForWeb> getNewsForCurrentVersionAndAfter(Principal principal) throws IOException {
        return transform(newsProvider.getNewsForCurrentVersionAndAfter());
    }

    @PutMapping("/internalapi/news/saveshown")
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
            final String newsAsMarkdown = entry.getNewsAsMarkdown();
            transformedEntries.add(new NewsEntryForWeb(entry.getShowForVersion().getAsString(), Markdown.renderMarkdownAsHtml(newsAsMarkdown), isForCurrentVersion, isForNewerVersion));
        }
        return transformedEntries;
    }

    @GetMapping("/internalapi/usernews")
    @Secured({"ROLE_USER"})
    public List<UserNewsEntryForWeb> getUnreadUserNews(Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        return userNewsProvider.getUnreadUserNewsForUser(username).stream()
                .map(entry -> new UserNewsEntryForWeb(
                        entry.getId(),
                        entry.getTitle(),
                        Markdown.renderMarkdownAsHtml(entry.getBody())
                ))
                .collect(Collectors.toList());
    }

    @PutMapping("/internalapi/usernews/{id}/dismiss")
    @Secured({"ROLE_USER"})
    public GenericResponse dismissUserNews(@PathVariable String id, Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        userNewsProvider.markNewsAsShownForUser(username, id);
        return GenericResponse.ok();
    }

}
