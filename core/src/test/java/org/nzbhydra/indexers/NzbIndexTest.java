package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.mapping.newznab.builder.RssBuilder;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.isEmptyOrNullString;
import static org.junit.Assert.assertThat;


public class NzbIndexTest {

    @Mock
    private CategoryProvider categoryProviderMock;

    @InjectMocks
    private NzbIndex testee = new NzbIndex();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.config = new IndexerConfig();
    }

    @Test
    public void shouldParseRows() throws Exception {
        Instant now = Instant.now();
        String enclosureUrl = "http://nzbindex.com/download/164950363/";
        String link = "http://nzbindex.com/download/164950363/";
        String guid = "http://nzbindex.com/collection/164950363/";
        NewznabXmlRoot root = RssBuilder.builder().items(
                Arrays.asList(
                        RssItemBuilder
                                .builder("[ Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN ] - [00/30] - \"Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN.nzb\" yEnc\n")
                                .link(link)
                                .pubDate(now)
                                .rssGuid(new NewznabXmlGuid(link, true))
                                .enclosure(new NewznabXmlEnclosure(enclosureUrl, 1089197181L, "application/x-nzb"))
                                .build())).build();
        List<SearchResultItem> items = testee.getSearchResultItems(root);
        assertThat(items.size(), is(1));
        SearchResultItem item = items.get(0);

        assertThat(item.getTitle(), is("164950363"));
        assertThat(item.getPubDate(), is(now));
        assertThat(item.isAgePrecise(), is(true));
        assertThat(item.getSize(), is(1089197181L));
        assertThat(item.getIndexerGuid(), is("164950363"));
        assertThat(item.getDownloadType(), is(DownloadType.NZB));
        assertThat(item.getHasNfo(), is(HasNfo.NO));

    }


}