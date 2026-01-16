

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.indexer.CapsCheckRequest;
import org.nzbhydra.news.NewsEntryForWeb;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class NewsTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldLoadAllNews() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();

        List<NewsEntryForWeb> newsEntries = hydraClient.get("/internalapi/news").as(new TypeReference<>() {
        });
        Assertions.assertThat(newsEntries)
            .hasSize(4)
            .anyMatch(x -> x.getVersion().equals("2.3.13"));
    }


}
