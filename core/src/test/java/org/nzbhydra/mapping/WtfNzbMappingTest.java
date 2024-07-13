package org.nzbhydra.mapping;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(SpringExtension.class)
public class WtfNzbMappingTest {

    @BeforeEach
    public void setUp() throws Exception {

    }


    @Test
    void testMappingFromXml() throws Exception {
        NewznabXmlRoot rssRoot = getRssRootFromXml("wtfnzb.xml");
        NewznabXmlChannel channel = rssRoot.getRssChannel();
        assertThat(channel.getItems().get(0).getPubDate()).isEqualTo(Instant.ofEpochMilli(1720154595000L));
    }


    private NewznabXmlRoot getRssRootFromXml(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(WtfNzbMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", NewznabXmlRoot.class);
    }


}
