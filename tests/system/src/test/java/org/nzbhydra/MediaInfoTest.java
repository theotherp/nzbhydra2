

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.indexer.CapsCheckRequest;
import org.nzbhydra.mediainfo.MediaInfoTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class MediaInfoTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldAutocompleteTV() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();

        List<MediaInfoTO> checkCapsResponses = hydraClient.get("/internalapi/autocomplete/TV", "input=Lost").as(new TypeReference<>() {
        });
        Assertions.assertThat(checkCapsResponses).isNotEmpty();
        MediaInfoTO mediaInfoTO = checkCapsResponses.get(0);
        Assertions.assertThat(mediaInfoTO.getTvmazeId()).isEqualTo("123");
        Assertions.assertThat(mediaInfoTO.getTitle()).isEqualTo("Lost");
        Assertions.assertThat(mediaInfoTO.getYear()).isEqualTo(2004);
    }

    @Test
    public void shouldAutocompleteMovie() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();

        List<MediaInfoTO> checkCapsResponses = hydraClient.get("/internalapi/autocomplete/MOVIE", "input=american beauty").as(new TypeReference<>() {
        });
        Assertions.assertThat(checkCapsResponses).isNotEmpty();
        MediaInfoTO mediaInfoTO = checkCapsResponses.get(0);
        Assertions.assertThat(mediaInfoTO.getTmdbId()).isEqualTo("14");

    }


}
