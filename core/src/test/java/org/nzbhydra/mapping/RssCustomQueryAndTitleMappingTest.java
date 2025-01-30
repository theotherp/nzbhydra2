package org.nzbhydra.mapping;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
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
public class RssCustomQueryAndTitleMappingTest {
    @BeforeEach
    public void setUp() throws Exception {

    }

    @Test
    void testMappingFromXml() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("newznab_3results.xml");
        NewznabXmlChannel channel = rssRoot.getRssChannel();
        assertThat(channel.getDescription()).isEqualTo("indexerName(dot)com Feed");
        assertThat(channel.getLink()).isEqualTo("https://indexerName.com/");
        assertThat(channel.getLanguage()).isEqualTo("en-gb");
        assertThat(channel.getWebMaster()).isEqualTo("admin@indexerName.com (indexerName(dot)com)");

        NewznabXmlResponse newznabResponse = channel.getNewznabResponse();
        assertThat(newznabResponse.getOffset()).isEqualTo(0);
        assertThat(newznabResponse.getTotal()).isEqualTo(1000);

        List<NewznabXmlItem> items = channel.getItems();
        assertThat(items.size()).isEqualTo(3);

        NewznabXmlItem item = items.get(0);
        assertThat(item.getLink()).isEqualTo("https://indexerName.com/getnzb/eff551fbdb69d6777d5030c209ee5d4b.nzb&i=1692&r=apikey");
        assertThat(item.getPubDate()).isEqualTo(Instant.ofEpochSecond(1444584857));
        assertThat(item.getDescription()).isEqualTo("testtitle1");
        assertThat(item.getComments()).isEqualTo("https://indexerName.com/details/eff551fbdb69d6777d5030c209ee5d4b#comments");

        NewznabXmlGuid rssGuid = item.getRssGuid();
        assertThat(rssGuid.getGuid()).isEqualTo("eff551fbdb69d6777d5030c209ee5d4b");
        assertThat(rssGuid.isPermaLink()).isEqualTo(false);

        NewznabXmlEnclosure enclosure = item.getEnclosure();
        assertThat(enclosure.getUrl()).isEqualTo("https://indexerName.com/getnzb/eff551fbdb69d6777d5030c209ee5d4b.nzb&i=1692&r=apikey");
        assertThat(enclosure.getLength()).isEqualTo(2893890900L);

        List<NewznabAttribute> attributes = item.getNewznabAttributes();
        assertThat(attributes.size()).isEqualTo(6);
        assertThat(attributes.get(0).getName()).isEqualTo("category");
        assertThat(attributes.get(0).getValue()).isEqualTo("7000");
        assertThat(attributes.get(2).getName()).isEqualTo("size");
        assertThat(attributes.get(2).getValue()).isEqualTo("2893890900");
        assertThat(attributes.get(3).getName()).isEqualTo("guid");
        assertThat(attributes.get(3).getValue()).isEqualTo("eff551fbdb69d6777d5030c209ee5d4b");
        assertThat(attributes.get(4).getName()).isEqualTo("poster");
        assertThat(attributes.get(4).getValue()).isEqualTo("chuck@norris.com");
        assertThat(attributes.get(5).getName()).isEqualTo("group");
        assertThat(attributes.get(5).getValue()).isEqualTo("alt.binaries.mom");
    }

    @Test
    void shouldParseResponseFromNzbsOrg() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("nzbsOrgResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(1000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromOmgwtf() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("omgwtfResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(416));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromNzbAG() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("nzbAgResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(125000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromTabulaRasa() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("tabulaRasaResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(125000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromNzbCat() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("nzbCatResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(125000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromDrunkenSlug() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("drunkenSlugResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(125000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromDrunkenSlugWithSomeApilimits() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("drunkenSlug_withSomeLimits.xml");

        assertThat(rssRoot.getRssChannel().getApiLimits().getApiCurrent()).isEqualTo(Integer.valueOf(44));
        assertThat(rssRoot.getRssChannel().getApiLimits().getApiMax()).isEqualTo(Integer.valueOf(50));
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabCurrent()).isNull();
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabMax()).isEqualTo(Integer.valueOf(5));
    }

    @Test
    void shouldParseResponseFromDrunkenSlugWithApilimits() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("drunkenSlug_withLimits.xml");

        assertThat(rssRoot.getRssChannel().getApiLimits().getApiCurrent()).isEqualTo(Integer.valueOf(44));
        assertThat(rssRoot.getRssChannel().getApiLimits().getApiMax()).isEqualTo(Integer.valueOf(50));
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabCurrent()).isEqualTo(Integer.valueOf(1));
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabMax()).isEqualTo(Integer.valueOf(5));
        assertThat(rssRoot.getRssChannel().getApiLimits().getApiOldestTime()).isNull();
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabOldestTime()).isNull();
    }

    @Test
    void shouldParseResponseFromTabulaRasaWithApilimits() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("tabluaRasa_withSomeLimits.xml");

        assertThat(rssRoot.getRssChannel().getApiLimits().getApiCurrent()).isEqualTo(Integer.valueOf(763));
        assertThat(rssRoot.getRssChannel().getApiLimits().getApiMax()).isEqualTo(Integer.valueOf(8000));
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabCurrent()).isEqualTo(Integer.valueOf(4));
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabMax()).isEqualTo(Integer.valueOf(8001));
        assertThat(rssRoot.getRssChannel().getApiLimits().getApiOldestTime().toString()).isEqualTo("2020-04-30T10:39:38Z");
        assertThat(rssRoot.getRssChannel().getApiLimits().getGrabOldestTime().toString()).isEqualTo("2020-04-30T17:54:30Z");
    }

    @Test
    void shouldParseResponseFromNzbFinder() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("nzbFinderResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(125000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseUnnamed() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("unnamedv2.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(2000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromNewztown() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("newztownResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(4443964));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromNzbSu() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("nzbSuResponse.xml");

        assertThat(rssRoot.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(Integer.valueOf(20000));
        assertThat(rssRoot.getRssChannel().getItems().get(0).getPubDate()).isNotNull();
    }

    @Test
    void shouldParseResponseFromCardigann() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("btnJackettResponse.xml");

        NewznabXmlChannel channel = rssRoot.getRssChannel();
        assertThat(channel.getDescription()).isEqualTo("Needs no description..");

        NewznabXmlResponse newznabResponse = channel.getNewznabResponse();
        assertThat(newznabResponse).isNull();

        List<NewznabXmlItem> items = channel.getItems();
        assertThat(items.size()).isEqualTo(3);
        NewznabXmlItem item = items.get(0);
        assertThat(item.getTitle()).isEqualTo("The.Challenge.S30.Special.14.Times.Our.Challengers.Found.Their.Shit.1080p.WEB.x264-CookieMonster");
        assertThat(item.getRssGuid().getGuid()).isEqualTo("https://unicasthe.net/torrents.php?action=download&id=799031&authkey=authkey&torrent_pass=torrentPass");
        assertThat(item.getLink()).startsWith("http://127.0.0.1:9117/dl/unicasthenet/jackettApiKey?path=linkstuff&file=The.Challenge.S30.Special.14.Times.Our.Challengers.Found.Their.Shit.1080p.WEB.x264-CookieMonster.torrent");
        assertThat(item.getCategory()).isEqualTo("5000");
        assertThat(item.getEnclosure().getLength()).isEqualTo(1459519537L);
        assertThat(item.getTorznabAttributes().size()).isEqualTo(6);
        assertThat(item.getTorznabAttributes().get(0).getName()).isEqualTo("rageid");
        assertThat(item.getTorznabAttributes().get(0).getValue()).isEqualTo("6126");
    }

    @Test
    void shouldParseResponseFromNzbIndex() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("nzbIndexResponse.xml");
        assertThat(rssRoot.getRssChannel().getItems()).hasSize(100);
    }


    private NewznabXmlRoot getRssRootFromXml(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(RssCustomQueryAndTitleMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", NewznabXmlRoot.class);
    }

    @Test
    void shouldSerializeToJson() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        NewznabXmlRoot rssRoot = getRssRootFromXml("newznab_3results.xml");
        String json = objectMapper.writeValueAsString(rssRoot);
        System.out.println(json);
    }


}
