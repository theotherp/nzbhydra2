

package org.nzbhydra.downloading.downloaders.torbox.mapping;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class TorboxFile {
    private long id;
    private String md5;
    private String hash;
    private String name;
    private long size;
    private boolean zipped;
    private String s3_path;
    private boolean infected;
    private String mimetype;
    private String short_name;
    private String absolute_path;
}