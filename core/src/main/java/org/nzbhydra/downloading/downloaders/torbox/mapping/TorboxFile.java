

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@JsonIgnoreProperties(ignoreUnknown = true)
public class TorboxFile {
    @JsonSetter(nulls = Nulls.SKIP)
    private long id;
    private String md5;
    private String hash;
    private String name;
    @JsonSetter(nulls = Nulls.SKIP)
    private long size;
    @JsonSetter(nulls = Nulls.SKIP)
    private boolean zipped;
    private String s3_path;
    @JsonSetter(nulls = Nulls.SKIP)
    private boolean infected;
    private String mimetype;
    private String short_name;
    private String absolute_path;
    private String opensubtitles_hash;
}