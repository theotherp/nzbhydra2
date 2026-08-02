

package org.nzbhydra;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.nzbhydra.mediainfo.MediaInfoTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;

import java.util.List;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class MediaInfoTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldAutocompleteTV() throws Exception {
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
        List<MediaInfoTO> checkCapsResponses = hydraClient.get("/internalapi/autocomplete/MOVIE", "input=Hydra Browser Movie").as(new TypeReference<>() {
        });
        Assertions.assertThat(checkCapsResponses).isNotEmpty();
        MediaInfoTO mediaInfoTO = checkCapsResponses.get(0);
        Assertions.assertThat(mediaInfoTO.getTmdbId()).isEqualTo("424242");
        Assertions.assertThat(mediaInfoTO.getTitle()).isEqualTo("Hydra Browser Movie");
        Assertions.assertThat(mediaInfoTO.getYear()).isEqualTo(2000);

    }


}
