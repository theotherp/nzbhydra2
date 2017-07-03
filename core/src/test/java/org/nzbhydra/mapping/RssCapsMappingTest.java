package org.nzbhydra.mapping;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mapping.newznab.caps.CapsCategory;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.web.WebConfiguration;
import org.springframework.http.MediaType;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import javax.xml.bind.JAXBException;
import javax.xml.transform.stream.StreamResult;
import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.Assert.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@RunWith(SpringRunner.class)
public class RssCapsMappingTest {


    private Jaxb2Marshaller jaxb2Marshaller = new WebConfiguration().marshaller();

    @Before
    public void setUp() throws Exception {

    }


    @Test
    public void shouldGenerateCorrectXml() throws JsonProcessingException, JAXBException {
        CapsRoot caps = new CapsRoot();
        List<CapsCategory> categories = new ArrayList<>();
        CapsCategory capsCategory = new CapsCategory(1000, "1000");
        List<CapsCategory> subCats = new ArrayList<>();
        subCats.add(new CapsCategory(1010, "1010"));
        capsCategory.setSubCategories(subCats);
        caps.getCategories().getCategories().add(capsCategory);
        StringWriter writer = new StringWriter();

        StreamResult streamResult = new StreamResult(writer);
        jaxb2Marshaller.marshal(caps, streamResult);
        assertThat(writer.toString(), containsString("<categories>\n" +
                "        <category id=\"1000\" name=\"1000\">\n" +
                "            <subcat id=\"1010\" name=\"1010\"/>\n" +
                "        </category>\n" +
                "    </categories>"));
    }


    private CapsRoot getCaps(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(RssCapsMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", CapsRoot.class);
    }


}