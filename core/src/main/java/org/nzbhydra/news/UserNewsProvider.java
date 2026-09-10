package org.nzbhydra.news;

import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

import java.io.File;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BooleanSupplier;
import java.util.stream.Collectors;

@Component
public class UserNewsProvider {

    private static final String USER_NEWS_FILE = "userNews.json";
    private static final String SHOWN_USER_NEWS_KEY = "shownUserNews";

    static final String DOCKER_STOP_GRACE_PERIOD_NEWS_ID = "docker-stop-grace-period-h2-2.4";
    static final String DOCKER_STOP_GRACE_PERIOD_NEWS_TITLE = "Give the container time to shut down";
    static final String DOCKER_STOP_GRACE_PERIOD_NEWS_BODY = """
            Hydra compacts its database on shutdown. Since the upgrade to H2 2.4 that compaction is what returns a grown database file to its real size.

            Docker's default stop grace period of 10 seconds is too short for large database files. Set `stop_grace_period: 120s` in your compose file (or use `docker stop -t 120`) and make sure the entrypoint forwards `SIGTERM` to the Hydra process instead of killing it.

            Killing the process does not corrupt the database but skips the cleanup of the database file on shutdown, so the file stays larger than necessary.

            Details are in `docs/database-upgrade-h2-2.4.md` in the repository.""";

    @Autowired
    private GenericStorage genericStorage;

    /**
     * Injectable so that tests can control the result without touching the file system.
     */
    private BooleanSupplier runInDockerSupplier = DebugInfosProvider::isRunInDocker;

    /**
     * The built-in entries are shown as a modal dialog on the first visit, which the browser system tests cannot work
     * around: their core runs in docker, and the state reset between specs brings the dialog back every time. The
     * systemtest profile turns them off, like {@code nzbhydra.welcomeShown} does for the welcome dialog.
     */
    @Value("${nzbhydra.userNews.builtInEnabled:true}")
    private boolean builtInNewsEnabled = true;

    public List<UserNewsEntry> getAllUserNews() {
        Map<String, UserNewsEntry> entriesById = new LinkedHashMap<>();
        for (UserNewsEntry entry : getUserNewsFromFile()) {
            entriesById.put(entry.getId(), entry);
        }
        for (UserNewsEntry entry : getBuiltInUserNews()) {
            //Entries from the file take precedence so that users can override or silence built-in entries
            entriesById.putIfAbsent(entry.getId(), entry);
        }
        return new ArrayList<>(entriesById.values());
    }

    List<UserNewsEntry> getBuiltInUserNews() {
        List<UserNewsEntry> entries = new ArrayList<>();
        if (!builtInNewsEnabled) {
            return entries;
        }
        if (runInDockerSupplier.getAsBoolean()) {
            entries.add(new UserNewsEntry(DOCKER_STOP_GRACE_PERIOD_NEWS_ID, DOCKER_STOP_GRACE_PERIOD_NEWS_TITLE, DOCKER_STOP_GRACE_PERIOD_NEWS_BODY, true));
        }
        return entries;
    }

    private List<UserNewsEntry> getUserNewsFromFile() {
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

    public List<UserNewsEntry> getUnreadUserNewsForUser(String username, boolean maySeeAdmin) {
        List<UserNewsEntry> allNews = getAllUserNews();
        if (allNews.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> shownNewsIds = getShownNewsIdsForUser(username);
        return allNews.stream()
                .filter(entry -> maySeeAdmin || !entry.isAdminOnly())
                .filter(entry -> !shownNewsIds.contains(entry.getId()))
                .collect(Collectors.toList());
    }

    void setRunInDockerSupplier(BooleanSupplier runInDockerSupplier) {
        this.runInDockerSupplier = runInDockerSupplier;
    }

    void setBuiltInNewsEnabled(boolean builtInNewsEnabled) {
        this.builtInNewsEnabled = builtInNewsEnabled;
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
