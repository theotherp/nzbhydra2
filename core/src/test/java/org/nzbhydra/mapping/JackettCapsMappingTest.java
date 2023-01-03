package org.nzbhydra.mapping;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlRoot;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URL;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(SpringExtension.class)
public class JackettCapsMappingTest {


    //@Ignore //Needs tbe mapped from XML to class
    @Test
    void testMappingFromXml() throws Exception {
        JacketCapsXmlRoot root = getRssRootFromXml("jackettConfiguredIndexers.xml");
        assertThat(root.getIndexers()).hasSize(13);
        assertThat(root.getIndexers().get(0).getTitle()).isEqualTo("BroadcastTheNet");
        assertThat(root.getIndexers().get(0).getCaps().getSearching().getSearch().getAvailable()).isEqualTo("yes");
        System.out.println(root);
    }


    private JacketCapsXmlRoot getRssRootFromXml(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        final URL resource = Resources.getResource(JackettCapsMappingTest.class, xmlFileName);
        final String xmlContent = Resources.toString(resource, Charsets.UTF_8);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(xmlContent, MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", JacketCapsXmlRoot.class);
    }

}
