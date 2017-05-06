package org.nzbhydra.indexers;

import lombok.Data;

import java.io.Serializable;

@Data
public class NfoResult implements Serializable {

    private boolean success;
    private boolean hasNfo;
    //Either the NFO or the error message if unsuccessful
    private String content;

    private NfoResult(boolean success, boolean hasNfo, String content) {
        this.success = success;
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
