

package org.nzbhydra.indexers.torbox.mapping;

import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.downloading.downloaders.torbox.mapping.UsenetListResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class TorboxMappingTest {

    @Test
    public void shouldDeserializeTorrentSearchResult() throws IOException {
        TorboxSearchResponse torrentResponse = Jackson.JSON_MAPPER.readValue(getClass().getResource("/org/nzbhydra/mapping/torboxTorrentsImdbResponse.json").openStream(), TorboxSearchResponse.class);
        assertThat(torrentResponse).isNotNull();
        TorboxSearchResultsContainer container = torrentResponse.getData();
        assertThat(container).isNotNull();
        assertThat(container.getTorrents()).hasSize(2);
        assertThat(container.getTorrents().get(0).getTitle()).isEqualTo("The Crazy Android");

        TorboxSearchResponse usenetResponse = Jackson.JSON_MAPPER.readValue(getClass().getResource("/org/nzbhydra/mapping/torboxUsenetImdbResponse.json").openStream(), TorboxSearchResponse.class);
        assertThat(usenetResponse).isNotNull();
        container = usenetResponse.getData();
        assertThat(container).isNotNull();
        assertThat(container.getNzbs()).hasSize(2);
        assertThat(container.getNzbs().get(0).getTitle()).isEqualTo("The Crazy Android.");

        UsenetListResponse usenetListResponse = Jackson.JSON_MAPPER.readValue(getClass().getResource("/org/nzbhydra/mapping/torboxMyDownloads.json").openStream(), UsenetListResponse.class);
        assertThat(usenetListResponse).isNotNull();
    }

}