package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.mapping.newznab.builder.RssBuilder;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.is;
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
        String enclosureUrl = "http://nzbindex.com/download/164950363/Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL.nzb";
        String link = "http://nzbindex.com/release/164950363/Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL.nzb";
        NewznabXmlRoot root = RssBuilder.builder().items(
                Arrays.asList(
                        RssItemBuilder
                                .builder("[ Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN ] - [00/30] - \"Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN.nzb\" yEnc\n")
                                .link(link)
                                .description("<![CDATA[\n" +
                                        "<p><font color=\"gray\">alt.binaries.hdtv.x264</font><br /> <b>1.01 GB</b><br /> 7 hours<br /> <font color=\"#3DA233\">31 files (1405 parts)</font> <font color=\"gray\">by s@nd.p (SP)</font><br /> <font color=\"#E2A910\"> 1 NFO | 9 PAR2 | 1 NZB | 19 ARCHIVE</font> - <a href=\"http://nzbindex.com/nfo/164950363/Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL.nzb/?q=\" target=\"_blank\">View NFO</a></p>\n" +
                                        "]]>")
                                .category("alt.binaries.hdtv.x264")
                                .pubDate(now)
                                .rssGuid(new NewznabXmlGuid(link, true))
                                .enclosure(new NewznabXmlEnclosure(enclosureUrl, 1089197181L, "application/x-nzb"))
                                .build())).build();
        List<SearchResultItem> items = testee.getSearchResultItems(root);
        assertThat(items.size(), is(1));
        SearchResultItem item = items.get(0);

        assertThat(item.getTitle(), is("Watchers.of.the.Universe.S02E09.1080p.WEB-DL.DD5.1.AAC2.0.H.264-YFN-0030-Watchers.of.the.Universe.S02E09.Cant.Get.You.out.of.My.Head.1080p.WEB-DL"));
        assertThat(item.getGroup().get(), is("alt.binaries.hdtv.x264"));
        assertThat(item.getPubDate(), is(now));
        assertThat(item.isAgePrecise(), is(true));
        assertThat(item.getSize(), is(1089197181L));
        assertThat(item.getIndexerGuid(), is("164950363"));
        assertThat(item.getDownloadType(), is(DownloadType.NZB));
        assertThat(item.getHasNfo(), is(HasNfo.YES));

    }


}