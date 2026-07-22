

package org.nzbhydra.searching.db;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.indexers.IndexerEntityTO;
import org.nzbhydra.springnative.ReflectionMarker;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.time.Instant;


@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class SearchResultEntityTO {

    @JsonSerialize(using = ToStringSerializer.class)
    private long id;
    private IndexerEntityTO indexer;
    private Instant firstFound;
    private String title;
    private String indexerGuid;
    private String link;
    private String details;
    private DownloadType downloadType;
    private Instant pubDate;
    private Integer indexerSearchEntityId;


}
