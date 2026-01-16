

package org.nzbhydra.downloading;

import com.fasterxml.jackson.databind.ObjectWriter;
import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class FileDownloadEntityTest {

    @Test
    public void shouldBeConvertibleToTest() throws Exception {
        FileDownloadEntity testee = new FileDownloadEntity();
        testee.setTime(Instant.now());
        testee.setIp("ip");
        testee.setAge(1);
        testee.setUsername("username");
        testee.setStatus(FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        testee.setExternalId("externalId");
        testee.setAccessSource(SearchSource.INTERNAL);
        testee.setNzbAccessType(FileDownloadAccessType.PROXY);
        final SearchResultEntity searchResult = new SearchResultEntity();
        searchResult.setIndexerGuid("indexerGuid");
        searchResult.setLink("link");
        searchResult.setTitle("title");
        searchResult.setDetails("details");
        searchResult.setFirstFound(Instant.now());
        searchResult.setPubDate(Instant.now());
        searchResult.setDownloadType(DownloadType.NZB);
        searchResult.setId(1234L);
        final IndexerEntity indexerEntity = new IndexerEntity("indexerName");
        searchResult.setIndexer(indexerEntity);
        final SearchEntity searchEntity = new SearchEntity();
        searchEntity.setQuery("query");
        searchResult.setIndexerSearchEntityId(1);

        testee.setSearchResult(searchResult);

        final ObjectWriter printer = Jackson.JSON_MAPPER.writerWithDefaultPrettyPrinter();
        final FileDownloadEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, FileDownloadEntityTO.class);
        final String jsonTO = printer.writeValueAsString(to)
                //Long value is serialized as string to prevent precision loss
                .replace("\"1234\"", "1234");
        final String jsonEntity = printer.writeValueAsString(testee);
        assertThat(jsonTO).isEqualTo(jsonEntity);
    }

}
