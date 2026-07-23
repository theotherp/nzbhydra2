package org.nzbhydra.news;

import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

import java.io.File;
import java.io.Serializable;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class UserNewsProvider {

    private static final String USER_NEWS_FILE = "userNews.json";
    private static final String SHOWN_USER_NEWS_KEY = "shownUserNews";

    @Autowired
    private GenericStorage genericStorage;

    public List<UserNewsEntry> getAllUserNews() {
        File userNewsFile = new File(NzbHydra.getDataFolder(), USER_NEWS_FILE);
        if (!userNewsFile.exists()) {
            return Collections.emptyList();
        }
        try {
            return Jackson.JSON_MAPPER.readValue(userNewsFile, new TypeReference<>() {
            });
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public List<UserNewsEntry> getUnreadUserNewsForUser(String username) {
        List<UserNewsEntry> allNews = getAllUserNews();
        if (allNews.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> shownNewsIds = getShownNewsIdsForUser(username);
        return allNews.stream()
                .filter(entry -> !shownNewsIds.contains(entry.getId()))
                .collect(Collectors.toList());
    }

    public void markNewsAsShownForUser(String username, String newsId) {
        Set<String> shownNewsIds = getShownNewsIdsForUser(username);
        shownNewsIds.add(newsId);
        genericStorage.save(getStorageKey(username), new ShownUserNewsIds(shownNewsIds));
    }

    private Set<String> getShownNewsIdsForUser(String username) {
        String key = getStorageKey(username);
        return genericStorage.get(key, ShownUserNewsIds.class)
                .map(ShownUserNewsIds::getIds)
                .orElse(new HashSet<>());
    }

    private String getStorageKey(String username) {
        return SHOWN_USER_NEWS_KEY + "-" + username;
    }

    @ReflectionMarker
    public static class ShownUserNewsIds implements Serializable {
        private Set<String> ids;

        public ShownUserNewsIds() {
            this.ids = new HashSet<>();
        }

        public ShownUserNewsIds(Set<String> ids) {
            this.ids = ids;
        }

        public Set<String> getIds() {
            return ids;
        }

        public void setIds(Set<String> ids) {
            this.ids = ids;
        }
    }
}
