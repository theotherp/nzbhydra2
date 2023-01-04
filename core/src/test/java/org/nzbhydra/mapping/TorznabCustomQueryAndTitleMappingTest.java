package org.nzbhydra.mapping;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(SpringExtension.class)
public class TorznabCustomQueryAndTitleMappingTest {

    @BeforeEach
    public void setUp() throws Exception {

    }


    @Test
    void testMappingFromXml() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("cardigann.xml");
        NewznabXmlChannel channel = rssRoot.getRssChannel();
        assertThat(channel.getTitle()).isEqualTo("some-torrents");
        assertThat(channel.getLink()).isEqualTo("https://some-torrents.com/");
        assertThat(channel.getLanguage()).isEqualTo("en-us");


        List<NewznabXmlItem> items = channel.getItems();
        assertThat(items.size()).isEqualTo(2);

        NewznabXmlItem item = items.get(0);
        assertThat(item.getLink()).isEqualTo("http://127.0.0.1:5060/download/111.torrent");
        assertThat(item.getPubDate()).isEqualTo(Instant.ofEpochSecond(1493900064));
        assertThat(item.getComments()).isEqualTo("https://some-torrents.com/details.php?id=111&page=0#startcomments");

        NewznabXmlGuid rssGuid = item.getRssGuid();
        assertThat(rssGuid.getGuid()).isEqualTo("https://some-torrents.com/details.php?id=111");

        NewznabXmlEnclosure enclosure = item.getEnclosure();
        assertThat(enclosure.getUrl()).isEqualTo("http://127.0.0.1:5060/download/111.torrent");

        List<NewznabAttribute> attributes = item.getTorznabAttributes();
        assertThat(attributes.size()).isEqualTo(8);
        assertThat(attributes.get(1).getName()).isEqualTo("seeders");
        assertThat(attributes.get(1).getValue()).isEqualTo("11");
        assertThat(attributes.get(5).getName()).isEqualTo("size");
        assertThat(attributes.get(5).getValue()).isEqualTo("620000000");
    }


    private NewznabXmlRoot getRssRootFromXml(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(TorznabCustomQueryAndTitleMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", NewznabXmlRoot.class);
    }


}
