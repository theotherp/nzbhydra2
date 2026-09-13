

package org.nzbhydra.indexers.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

import java.util.List;

@Data
@ReflectionMarker
@JsonIgnoreProperties(ignoreUnknown = true)
public class TorboxResult {
    private String hash;

    @JsonProperty("raw_title")
    private String rawTitle;

    private String title;

    @JsonProperty("title_parsed_data")
    private TitleParsedData titleParsedData;

    private String magnet;
    private String torrent;

    @JsonProperty("last_known_seeders")
    private int lastKnownSeeders;

    @JsonProperty("last_known_peers")
    private int lastKnownPeers;

    private long size;
    private String tracker;
    private List<String> categories;
    private int files;
    //Do not use for now, is not only usenet or torrent but also sometimes movie
//    @JsonDeserialize(using = TorboxResultTypeDeserializer.class)
    private String type;
    private String nzb;
    private String age;

    public static class TorboxResultTypeDeserializer extends ValueDeserializer<TorboxResultType> {
        @Override
        public TorboxResultType deserialize(JsonParser p, DeserializationContext ctxt) {
            String value = p.getString().toUpperCase();

            return TorboxResultType.valueOf(value);
        }
    }
}
