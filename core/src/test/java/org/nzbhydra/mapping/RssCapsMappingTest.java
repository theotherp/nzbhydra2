package org.nzbhydra.mapping;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import jakarta.xml.bind.JAXBException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategory;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.web.WebConfiguration;
import org.springframework.http.MediaType;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import javax.xml.transform.stream.StreamResult;
import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(SpringExtension.class)
public class RssCapsMappingTest {


    private Jaxb2Marshaller jaxb2Marshaller = new WebConfiguration().marshaller();

    @BeforeEach
    public void setUp() throws Exception {

    }


    @Test
    void shouldGenerateCorrectXml() throws JsonProcessingException, JAXBException {
        CapsXmlRoot caps = new CapsXmlRoot();
        List<CapsXmlCategory> categories = new ArrayList<>();
        CapsXmlCategory capsCategory = new CapsXmlCategory(1000, "1000");
        List<CapsXmlCategory> subCats = new ArrayList<>();
        subCats.add(new CapsXmlCategory(1010, "1010"));
        capsCategory.setSubCategories(subCats);
        caps.getCategories().getCategories().add(capsCategory);
        StringWriter writer = new StringWriter();

        StreamResult streamResult = new StreamResult(writer);
        jaxb2Marshaller.marshal(caps, streamResult);
        assertThat(writer.toString()).contains("<categories>\n" +
            "        <category id=\"1000\" name=\"1000\">\n" +
            "            <subcat id=\"1010\" name=\"1010\"/>\n" +
            "        </category>\n" +
            "    </categories>");
    }


    private CapsXmlRoot getCaps(String xmlFileName) throws IOException {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(restTemplate);
        mockServer.expect(requestTo("/api")).andRespond(withSuccess(Resources.toString(Resources.getResource(RssCapsMappingTest.class, xmlFileName), Charsets.UTF_8), MediaType.APPLICATION_XML));

        return restTemplate.getForObject("/api", CapsXmlRoot.class);
    }


}
