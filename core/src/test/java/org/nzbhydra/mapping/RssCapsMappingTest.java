package org.nzbhydra.mapping;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mapping.newznab.caps.CapsCategory;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@RunWith(SpringRunner.class)
public class RssCapsMappingTest {
    @Before
    public void setUp() throws Exception {

    }

    @Test
    public void testMappingFromXml() throws Exception {
        CapsRoot caps = getCaps("dognzbCapsResponse.xml");

        System.out.println();


    }

    @Test
    public void shouldGenerateCorrectXml() throws JsonProcessingException {
        CapsRoot caps = new CapsRoot();
        List<CapsCategory> categories = new ArrayList<>();
        CapsCategory capsCategory = new CapsCategory(1000, "1000");
        List<CapsCategory> subCats = new ArrayList<>();
        subCats.add(new CapsCategory(1010, "1010"));
        capsCategory.setSubCategories(subCats);
        caps.getCategories().getCategories().add(capsCategory);
        String xml = new XmlMapper().writeValueAsString(caps);
        System.out.println(xml);
    }


    private CapsRoot getCaps(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(RssCapsMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", CapsRoot.class);
    }


}