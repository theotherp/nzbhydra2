package org.nzbhydra.mapping;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlRoot;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@RunWith(SpringRunner.class)
public class JackettCapsMappingTest {


    @Test
    public void testMappingFromXml() throws Exception {
        JacketCapsXmlRoot root = getRssRootFromXml("jackettConfiguredIndexers.xml");
        assertThat(root.getIndexers()).hasSize(13);
        assertThat(root.getIndexers().get(0).getTitle()).isEqualTo("BroadcastTheNet");
        assertThat(root.getIndexers().get(0).getCaps().getSearching().getSearch().getAvailable()).isEqualTo("yes");
        System.out.println(root);
    }


    private JacketCapsXmlRoot getRssRootFromXml(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(JackettCapsMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", JacketCapsXmlRoot.class);
    }

}