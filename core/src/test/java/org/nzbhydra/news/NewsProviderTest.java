package org.nzbhydra.news;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.news.NewsProvider.NewsEntry;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.webaccess.WebAccess;

import java.text.ParseException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class NewsProviderTest {

    @Mock
    private UpdateManager updateManagerMock;
    @Mock
    private ShownNewsRepository shownNewsRepositoryMock;
    @Mock
    private WebAccess webAccessMock;

    @InjectMocks
    private NewsProvider testee = new NewsProvider();

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(webAccessMock.callUrl(any(), any(TypeReference.class))).thenReturn(getNewsJson());
        testee.lastCheckedForNews = Instant.ofEpochMilli(0);
    }

    @Test
    void getNews() throws Exception {
        List<NewsEntry> entries = testee.getNews();
        assertThat(entries.size()).isEqualTo(3);
        assertThat(entries.get(0).getNewsAsMarkdown()).isEqualTo("news3.0.0");
        assertThat(entries.get(0).getShowForVersion().major).isEqualTo(3);
    }

    @Test
    void shouldOnlyGetNewsNewerThanShownButNotNewerThanCurrentVersion() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("2.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.singletonList(new ShownNews("1.0.0")));
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size()).isEqualTo(1);
        assertThat(entries.get(0).getNewsAsMarkdown()).isEqualTo("news2.0.0");
    }

    @Test
    void shouldOnlyGetNewstNotNewerThanCurrentVersion() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("2.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.singletonList(new ShownNews("0.0.1")));
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size()).isEqualTo(2);
        assertThat(entries.get(0).getNewsAsMarkdown()).isEqualTo("news2.0.0");
        assertThat(entries.get(1).getNewsAsMarkdown()).isEqualTo("news1.0.0");
    }

    @Test
    void shouldNoNewsWhenNewInstall() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("2.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.emptyList());
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size()).isEqualTo(0);
    }

    @Test
    void shouldNotGetNewsWhenAlreadyShown() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("3.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.singletonList(new ShownNews("3.0.0")));
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size()).isEqualTo(0);
    }

    protected List<NewsEntry> getNewsJson() throws ParseException, JsonProcessingException {
        NewsEntry entry1 = new NewsEntry(new SemanticVersion("1.0.0"), "news1.0.0");
        NewsEntry entry2 = new NewsEntry(new SemanticVersion("2.0.0"), "news2.0.0");
        NewsEntry entry3 = new NewsEntry(new SemanticVersion("3.0.0"), "news3.0.0");
        List<NewsEntry> entries = Arrays.asList(entry2, entry1, entry3);

        return entries;
    }


}
