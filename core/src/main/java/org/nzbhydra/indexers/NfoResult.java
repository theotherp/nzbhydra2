package org.nzbhydra.indexers;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;

@Data
@ReflectionMarker
public class NfoResult implements Serializable {

    private boolean successful;
    private boolean hasNfo;
    //Either the NFO or the error message if unsuccessful
    private String content;

    private NfoResult(boolean successful, boolean hasNfo, String content) {
        this.successful = successful;
        this.hasNfo = hasNfo;
        this.content = content;
    }

    public static NfoResult unsuccessful(String error) {
        return new NfoResult(false, false, error);
    }

    public static NfoResult withNfo(String nfo) {
        return new NfoResult(true, true, nfo);
    }

    public static NfoResult withoutNfo() {
        return new NfoResult(true, false, null);
    }

}
