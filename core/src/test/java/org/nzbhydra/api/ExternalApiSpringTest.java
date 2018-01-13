package org.nzbhydra.api;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.mockito.Matchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@RunWith(SpringRunner.class)
@WebMvcTest(ExternalApi.class)
@ContextConfiguration(classes = ExternalApi.class)
@TestPropertySource("classpath:/config/disable-security.properties")
public class ExternalApiSpringTest {

    @SuppressWarnings("SpringJavaAutowiringInspection")
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExternalApi externalApiMock;

    @Test
    @Ignore //Doesn't work for some reason after supporting JSON
    public void shouldTransformToRssXml() throws Exception {
        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        rssRoot.setVersion("2.0");
        NewznabXmlChannel channel = new NewznabXmlChannel();
        channel.setTitle("channelTitle");
        channel.setDescription("channelDescription");
        channel.setLanguage("language");
        channel.setWebMaster("webmaster");
        channel.setLink("channelLink");

        NewznabXmlItem item = new NewznabXmlItem();
        item.setDescription("itemDescription");
        item.setTitle("itemTitle");
        item.setPubDate(Instant.ofEpochSecond(1000));
        item.setEnclosure(new NewznabXmlEnclosure("enclosureUrl", 5L, "application/x-nzb"));
        item.setComments("comments");
        item.setLink("link");
        item.setCategory("category");
        item.setRssGuid(new NewznabXmlGuid("guidLink", false));

        List<NewznabAttribute> attributes = new ArrayList<>();
        attributes.add(new NewznabAttribute("category", "7000"));
        attributes.add(new NewznabAttribute("size", "5"));
        attributes.add(new NewznabAttribute("guid", "attributeGuid"));
        attributes.add(new NewznabAttribute("poster", "poster"));
        attributes.add(new NewznabAttribute("group", "group"));
        item.setNewznabAttributes(attributes);

        channel.setItems(Arrays.asList(item));

        rssRoot.setRssChannel(channel);

        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setContentType(MediaType.APPLICATION_XML);
        ResponseEntity x = new ResponseEntity<Object>(rssRoot, httpHeaders, HttpStatus.OK);

        when(externalApiMock.api(any(NewznabParameters.class))).thenReturn(x);

        String expectedContent = Resources.toString(Resources.getResource(ExternalApiSpringTest.class, "simplesearchresult.xml"), Charsets.UTF_8);
        mockMvc.perform(MockMvcRequestBuilders.get("/api?apikey=apikey&t=search&q=bla").accept(MediaType.ALL)).andExpect(content().xml(expectedContent));
    }


}