package org.nzbhydra.indexers;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@Data
@ReflectionMarker
public class IndexerEntityTO {

    protected int id;

    private String name;

    public IndexerEntityTO() {
    }

    public IndexerEntityTO(String name) {
        this.name = name;
    }


}
