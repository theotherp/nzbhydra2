

package org.nzbhydra.indexers.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.IOException;
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

    public static class TorboxResultTypeDeserializer extends JsonDeserializer<TorboxResultType> {
        @Override
        public TorboxResultType deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            String value = p.getText().toUpperCase();

            return TorboxResultType.valueOf(value);
        }
    }
}
