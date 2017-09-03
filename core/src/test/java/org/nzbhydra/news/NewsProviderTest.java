package org.nzbhydra.news;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.news.NewsProvider.NewsEntry;
import org.nzbhydra.update.UpdateManager;

import java.text.ParseException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

public class NewsProviderTest {

    @Mock
    private UpdateManager updateManagerMock;
    @Mock
    private ShownNewsRepository shownNewsRepositoryMock;

    @InjectMocks
    private NewsProvider testee = new NewsProvider();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = spy(testee);
        doReturn(getNewsJson()).when(testee).getNewsFromGithub();
        testee.lastCheckedForNews = Instant.ofEpochMilli(0);
    }

    @Test
    public void getNews() throws Exception {
        List<NewsEntry> entries = testee.getNews();
        assertThat(entries.size(), is(3));
        assertThat(entries.get(0).getNewsAsMarkdown(), is("news3.0.0"));
        assertThat(entries.get(0).getShowForVersion().major, is(3));
    }

    @Test
    public void shouldOnlyGetNewsNewerThanShownButNotNewerThanCurrentVersion() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("2.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.singletonList(new ShownNews("1.0.0")));
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size(), is(1));
        assertThat(entries.get(0).getNewsAsMarkdown(), is("news2.0.0"));
    }

    @Test
    public void shouldOnlyGetNewstNotNewerThanCurrentVersion() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("2.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.emptyList());
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size(), is(2));
        assertThat(entries.get(0).getNewsAsMarkdown(), is("news2.0.0"));
        assertThat(entries.get(1).getNewsAsMarkdown(), is("news1.0.0"));
    }

    @Test
    public void shouldNotGetNewsWhenAlreadyShown() throws Exception {
        when(updateManagerMock.getCurrentVersionString()).thenReturn("3.0.0");
        when(shownNewsRepositoryMock.findAll()).thenReturn(Collections.singletonList(new ShownNews("3.0.0")));
        List<NewsEntry> entries = testee.getNewsForCurrentVersionAndAfter();
        assertThat(entries.size(), is(0));
    }

    protected String getNewsJson() throws ParseException, JsonProcessingException {
        NewsEntry entry1 = new NewsEntry(new SemanticVersion("1.0.0"), "news1.0.0");
        NewsEntry entry2 = new NewsEntry(new SemanticVersion("2.0.0"), "news2.0.0");
        NewsEntry entry3 = new NewsEntry(new SemanticVersion("3.0.0"), "news3.0.0");
        List<NewsEntry> entries = Arrays.asList(entry2, entry1, entry3);

        String newsJson = new ObjectMapper().writeValueAsString(entries);
        return newsJson;
    }


}