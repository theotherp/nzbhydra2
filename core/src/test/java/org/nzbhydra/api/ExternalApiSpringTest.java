package org.nzbhydra.api;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mapping.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
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
public class ExternalApiSpringTest {

    @SuppressWarnings("SpringJavaAutowiringInspection")
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExternalApi externalApiMock;


    @Test
    public void shouldTransformToRssXml() throws Exception {

        RssRoot rssRoot = new RssRoot();
        rssRoot.setVersion("2.0");
        RssChannel channel = new RssChannel();
        channel.setTitle("channelTitle");
        channel.setDescription("channelDescription");
        channel.setLanguage("language");
        channel.setWebMaster("webmaster");
        channel.setLink("channelLink");

        RssItem item = new RssItem();
        item.setDescription("itemDescription");
        item.setTitle("itemTitle");
        item.setPubDate(Instant.ofEpochSecond(1000));
        item.setEnclosure(new Enclosure("enclosureUrl", 5L));
        item.setComments("comments");
        item.setLink("link");
        item.setCategory("category");
        item.setRssGuid(new RssGuid("guidLink", false));

        List<NewznabAttribute> attributes = new ArrayList<>();
        attributes.add(new NewznabAttribute("category", "7000"));
        attributes.add(new NewznabAttribute("size", "5"));
        attributes.add(new NewznabAttribute("guid", "attributeGuid"));
        attributes.add(new NewznabAttribute("poster", "poster"));
        attributes.add(new NewznabAttribute("group", "group"));
        item.setAttributes(attributes);

        channel.setItems(Arrays.asList(item));

        rssRoot.setRssChannel(channel);
        when(externalApiMock.api(any(ApiCallParameters.class))).thenReturn(rssRoot);

        String expectedContent = Resources.toString(Resources.getResource(ExternalApiSpringTest.class, "simplesearchresult.xml"), Charsets.UTF_8);
        mockMvc.perform(MockMvcRequestBuilders.get("/api").accept(MediaType.ALL)).andExpect(content().xml(expectedContent));
    }


}