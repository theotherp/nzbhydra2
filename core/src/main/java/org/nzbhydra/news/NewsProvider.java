package org.nzbhydra.news;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class NewsProvider {

    private static final Logger logger = LoggerFactory.getLogger(NewsProvider.class);

    @Autowired
    private ShownNewsRepository shownNewsRepository;
    @Autowired
    private UpdateManager updateManager;
    @Autowired
    protected WebAccess webAccess;

    @Value("${nzbhydra.newsUrl}")
    protected String newsUrl;
    protected Instant lastCheckedForNews = Instant.ofEpochMilli(0L);
    private List<NewsEntry> newsEntries;

    public List<NewsEntry> getNews() throws IOException {
        if (Instant.now().minus(2, ChronoUnit.HOURS).isAfter(lastCheckedForNews)) {
            newsEntries = webAccess.callUrl(newsUrl, new TypeReference<List<NewsEntry>>() {
            });
            newsEntries.sort(Comparator.comparing(NewsEntry::getShowForVersion).reversed());
            lastCheckedForNews = Instant.now();
        }
        return newsEntries;
    }

    public void saveShownForCurrentVersion() throws IOException {
        shownNewsRepository.deleteAll(shownNewsRepository.findAll());
        shownNewsRepository.save(new ShownNews(updateManager.getCurrentVersionString()));
        logger.debug("Saved that news for version {} and before were shown", updateManager.getCurrentVersionString());
    }

    public List<NewsEntry> getNewsForCurrentVersionAndAfter() throws IOException {
        List<ShownNews> shownNews = shownNewsRepository.findAll();
        SemanticVersion from = shownNews.size() == 1 ? new SemanticVersion(shownNews.get(0).getVersion()) : null;
        SemanticVersion to = new SemanticVersion(updateManager.getCurrentVersionString());

        List<NewsEntry> news = getNews();
        return news.stream().filter(x -> !(from != null && from.isSameOrNewer(x.getShowForVersion()) || x.getShowForVersion().isUpdateFor(to))).collect(Collectors.toList());

    }


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class NewsEntry {
        private SemanticVersion showForVersion;
        private String newsAsMarkdown;
    }

}
