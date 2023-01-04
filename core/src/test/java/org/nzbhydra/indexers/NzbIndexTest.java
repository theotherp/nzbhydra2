package org.nzbhydra.indexers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;


public class NzbIndexTest {

    @Mock
    private CategoryProvider categoryProviderMock;

    @InjectMocks
    private NzbIndex testee = new NzbIndex(null, null, null, null, null, null, null, null, categoryProviderMock, null, null, null, null, null);

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.config = new IndexerConfig();
    }

    @Test
    void shouldParseRows() throws Exception {
        Instant now = Instant.now();
        String enclosureUrl = "https://beta.nzbindex.com/collection/164950363";
        String link = "https://beta.nzbindex.com/download/164950363/";
        NewznabXmlRoot root = RssBuilder.builder().items(
            Arrays.asList(
                RssItemBuilder
                    .builder("Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL")
                    .link(link)
                    .description("<![CDATA[\n" +
                        "<p><font color=\"gray\">alt.binaries.hdtv.x264</font><br /> <b>1.01 GB</b><br /> 7 hours<br /> <font color=\"#3DA233\">31 files (1405 parts)</font> <font color=\"gray\">by s@nd.p (SP)</font><br /> <font color=\"#E2A910\"> 1 NFO | 9 PAR2 | 1 NZB | 19 ARCHIVE</font> - <a href=\"http://nzbindex.com/nfo/164950363/Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL.nzb/?q=\" target=\"_blank\">View NFO</a></p>\n" +
                        "]]>")
                    .category("alt.binaries.hdtv.x264")
                    .pubDate(now)
                    .rssGuid(new NewznabXmlGuid(link, true))
                    .enclosure(new NewznabXmlEnclosure(enclosureUrl, 1089197181L, "application/x-nzb"))
                    .build())).build();
        List<SearchResultItem> items = testee.getSearchResultItems(root, new SearchRequest());
        assertThat(items.size()).isEqualTo(1);
        SearchResultItem item = items.get(0);

        assertThat(item.getTitle()).isEqualTo("Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL");
        assertThat(item.getGroup().get()).isEqualTo("alt.binaries.hdtv.x264");
        assertThat(item.getPubDate()).isEqualTo(now);
        assertThat(item.isAgePrecise()).isEqualTo(true);
        assertThat(item.getSize()).isEqualTo(1089197181L);
        assertThat(item.getIndexerGuid()).isEqualTo("164950363");
        assertThat(item.getDownloadType()).isEqualTo(DownloadType.NZB);
        assertThat(item.getHasNfo()).isEqualTo(HasNfo.NO);

    }


}
