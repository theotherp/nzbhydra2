

package org.nzbhydra.indexers.torbox.mapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@ReflectionMarker
public class TitleParsedData {
    private String resolution;
    private String quality;
    private int year;
    private String codec;
    private String audio;
    private Integer bitDepth;
    private String title;
    private String filetype;
    private Boolean hdr;
    private Boolean remux;
    private String encoder;
}
