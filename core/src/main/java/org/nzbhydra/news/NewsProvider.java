package org.nzbhydra.news;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import okhttp3.Request;
import okhttp3.Response;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.update.UpdateManager;
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
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;

    @Value("${nzbhydra.newsUrl}")
    protected String newsUrl;
    protected Instant lastCheckedForNews = Instant.ofEpochMilli(0L);
    private List<NewsEntry> newsEntries;

    public List<NewsEntry> getNews() throws IOException {
        if (Instant.now().minus(2, ChronoUnit.HOURS).isAfter(lastCheckedForNews)) {
            String body = getNewsFromGithub();
            newsEntries = new ObjectMapper().readValue(body, new TypeReference<List<NewsEntry>>() {
            });
            newsEntries.sort(Comparator.comparing(NewsEntry::getShowForVersion).reversed());
            lastCheckedForNews = Instant.now();
        }
        return newsEntries;
    }

    public void saveShownForCurrentVersion() throws IOException {
        shownNewsRepository.delete(shownNewsRepository.findAll());
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


    protected String getNewsFromGithub() throws IOException {
        Request request = new Request.Builder().url(newsUrl).build();
        logger.debug("Getting news from GitHub");
        try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
            return response.body().string();
        }
    }


    @Data
    @AllArgsConstructor
    public static class NewsEntry {
        private SemanticVersion showForVersion;
        private String newsAsMarkdown;
    }

}
