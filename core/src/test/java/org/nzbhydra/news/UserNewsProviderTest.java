package org.nzbhydra.news;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.news.UserNewsProvider.ShownUserNewsIds;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class UserNewsProviderTest {

    @TempDir
    Path tempDir;

    @Mock
    private GenericStorage genericStorageMock;

    @InjectMocks
    private UserNewsProvider testee = new UserNewsProvider();

    private String originalDataFolder;

    @BeforeEach
    public void setUp() {
        originalDataFolder = NzbHydra.getDataFolder();
        NzbHydra.setDataFolder(tempDir.toString());
        testee.setRunInDockerSupplier(() -> false);
    }

    @AfterEach
    public void tearDown() {
        NzbHydra.setDataFolder(originalDataFolder);
    }

    @Test
    void shouldReturnEmptyListWhenFileDoesNotExist() {
        List<UserNewsEntry> news = testee.getAllUserNews();
        assertThat(news).isEmpty();
    }

    @Test
    void shouldReturnEmptyListWhenFileIsInvalid() throws IOException {
        Files.writeString(tempDir.resolve("userNews.json"), "invalid json");

        List<UserNewsEntry> news = testee.getAllUserNews();
        assertThat(news).isEmpty();
    }

    @Test
    void shouldParseValidUserNewsFile() throws IOException {
        String json = """
                [
                    {"id": "news1", "title": "Title 1", "body": "Body 1"},
                    {"id": "news2", "title": "Title 2", "body": "## Markdown body"}
                ]
                """;
        Files.writeString(tempDir.resolve("userNews.json"), json);

        List<UserNewsEntry> news = testee.getAllUserNews();

        assertThat(news).hasSize(2);
        assertThat(news.get(0).getId()).isEqualTo("news1");
        assertThat(news.get(0).getTitle()).isEqualTo("Title 1");
        assertThat(news.get(0).getBody()).isEqualTo("Body 1");
        assertThat(news.get(1).getId()).isEqualTo("news2");
        assertThat(news.get(1).getTitle()).isEqualTo("Title 2");
        assertThat(news.get(1).getBody()).isEqualTo("## Markdown body");
    }

    @Test
    void shouldReturnOnlyUnreadNews() throws IOException {
        String json = """
                [
                    {"id": "news1", "title": "Title 1", "body": "Body 1"},
                    {"id": "news2", "title": "Title 2", "body": "Body 2"},
                    {"id": "news3", "title": "Title 3", "body": "Body 3"}
                ]
                """;
        Files.writeString(tempDir.resolve("userNews.json"), json);

        Set<String> shownIds = new HashSet<>();
        shownIds.add("news1");
        shownIds.add("news3");
        when(genericStorageMock.get(eq("shownUserNews-testuser"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.of(new ShownUserNewsIds(shownIds)));

        List<UserNewsEntry> unreadNews = testee.getUnreadUserNewsForUser("testuser", true);

        assertThat(unreadNews).hasSize(1);
        assertThat(unreadNews.get(0).getId()).isEqualTo("news2");
    }

    @Test
    void shouldReturnAllNewsWhenNoneShown() throws IOException {
        String json = """
                [
                    {"id": "news1", "title": "Title 1", "body": "Body 1"},
                    {"id": "news2", "title": "Title 2", "body": "Body 2"}
                ]
                """;
        Files.writeString(tempDir.resolve("userNews.json"), json);

        when(genericStorageMock.get(eq("shownUserNews-testuser"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.empty());

        List<UserNewsEntry> unreadNews = testee.getUnreadUserNewsForUser("testuser", true);

        assertThat(unreadNews).hasSize(2);
    }

    @Test
    void shouldMarkNewsAsShown() throws IOException {
        when(genericStorageMock.get(eq("shownUserNews-testuser"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.empty());

        testee.markNewsAsShownForUser("testuser", "news1");

        verify(genericStorageMock).save(eq("shownUserNews-testuser"), any(ShownUserNewsIds.class));
    }

    @Test
    void shouldAddToExistingShownNews() throws IOException {
        Set<String> existingIds = new HashSet<>();
        existingIds.add("news1");
        when(genericStorageMock.get(eq("shownUserNews-testuser"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.of(new ShownUserNewsIds(existingIds)));

        testee.markNewsAsShownForUser("testuser", "news2");

        verify(genericStorageMock).save(eq("shownUserNews-testuser"), any(ShownUserNewsIds.class));
    }

    @Test
    void shouldUseUserSpecificStorageKey() throws IOException {
        String json = """
                [{"id": "news1", "title": "Title 1", "body": "Body 1"}]
                """;
        Files.writeString(tempDir.resolve("userNews.json"), json);

        Set<String> user1ShownIds = new HashSet<>();
        user1ShownIds.add("news1");
        when(genericStorageMock.get(eq("shownUserNews-user1"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.of(new ShownUserNewsIds(user1ShownIds)));
        when(genericStorageMock.get(eq("shownUserNews-user2"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.empty());

        List<UserNewsEntry> user1News = testee.getUnreadUserNewsForUser("user1", true);
        List<UserNewsEntry> user2News = testee.getUnreadUserNewsForUser("user2", true);

        assertThat(user1News).isEmpty();
        assertThat(user2News).hasSize(1);
    }

    @Test
    void shouldIncludeBuiltInDockerNewsWhenRunInDocker() {
        testee.setRunInDockerSupplier(() -> true);

        List<UserNewsEntry> news = testee.getAllUserNews();

        assertThat(news).extracting(UserNewsEntry::getId).contains(UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID);
        UserNewsEntry dockerEntry = news.stream().filter(x -> UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID.equals(x.getId())).findFirst().orElseThrow();
        assertThat(dockerEntry.isAdminOnly()).isTrue();
        assertThat(dockerEntry.getTitle()).isNotEmpty();
        assertThat(dockerEntry.getBody()).contains("stop_grace_period: 120s");
    }

    @Test
    void shouldNotIncludeBuiltInNewsWhenDisabledByProperty() {
        testee.setRunInDockerSupplier(() -> true);
        testee.setBuiltInNewsEnabled(false);

        List<UserNewsEntry> news = testee.getAllUserNews();

        assertThat(news).noneMatch(x -> UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID.equals(x.getId()));
    }

    @Test
    void shouldNotIncludeBuiltInDockerNewsWhenNotRunInDocker() {
        testee.setRunInDockerSupplier(() -> false);

        List<UserNewsEntry> news = testee.getAllUserNews();

        assertThat(news).extracting(UserNewsEntry::getId).doesNotContain(UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID);
    }

    @Test
    void shouldHideAdminOnlyNewsFromNonAdmins() throws IOException {
        String json = """
                [
                    {"id": "news1", "title": "Title 1", "body": "Body 1", "adminOnly": true},
                    {"id": "news2", "title": "Title 2", "body": "Body 2"}
                ]
                """;
        Files.writeString(tempDir.resolve("userNews.json"), json);
        when(genericStorageMock.get(eq("shownUserNews-testuser"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.empty());

        assertThat(testee.getUnreadUserNewsForUser("testuser", false)).extracting(UserNewsEntry::getId).containsExactly("news2");
        assertThat(testee.getUnreadUserNewsForUser("testuser", true)).extracting(UserNewsEntry::getId).containsExactly("news1", "news2");
    }

    @Test
    void shouldParseFileEntriesWithoutAdminOnlyFieldAndShowThemToEveryone() throws IOException {
        String json = """
                [
                    {"id": "news1", "title": "Title 1", "body": "Body 1", "someUnknownField": "x"}
                ]
                """;
        Files.writeString(tempDir.resolve("userNews.json"), json);
        when(genericStorageMock.get(eq("shownUserNews-testuser"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.empty());

        assertThat(testee.getAllUserNews()).hasSize(1);
        assertThat(testee.getAllUserNews().get(0).isAdminOnly()).isFalse();
        assertThat(testee.getUnreadUserNewsForUser("testuser", false)).hasSize(1);
    }

    @Test
    void shouldHideDismissedBuiltInNewsForThatUserOnly() {
        testee.setRunInDockerSupplier(() -> true);
        Set<String> shownIds = new HashSet<>();
        shownIds.add(UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID);
        when(genericStorageMock.get(eq("shownUserNews-user1"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.of(new ShownUserNewsIds(shownIds)));
        when(genericStorageMock.get(eq("shownUserNews-user2"), eq(ShownUserNewsIds.class)))
                .thenReturn(Optional.empty());

        assertThat(testee.getUnreadUserNewsForUser("user1", true)).isEmpty();
        assertThat(testee.getUnreadUserNewsForUser("user2", true)).extracting(UserNewsEntry::getId).containsExactly(UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID);
    }

    @Test
    void shouldMergeFileAndBuiltInNewsWithoutDuplicateIds() throws IOException {
        testee.setRunInDockerSupplier(() -> true);
        String json = """
                [
                    {"id": "news1", "title": "Title 1", "body": "Body 1"},
                    {"id": "%s", "title": "Overridden", "body": "Overridden body"}
                ]
                """.formatted(UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID);
        Files.writeString(tempDir.resolve("userNews.json"), json);

        List<UserNewsEntry> news = testee.getAllUserNews();

        assertThat(news).extracting(UserNewsEntry::getId).doesNotHaveDuplicates();
        assertThat(news).extracting(UserNewsEntry::getId).containsExactlyInAnyOrder("news1", UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID);
        assertThat(news.stream().filter(x -> UserNewsProvider.DOCKER_STOP_GRACE_PERIOD_NEWS_ID.equals(x.getId())).findFirst().orElseThrow().getTitle()).isEqualTo("Overridden");
    }
}
