package org.nzbhydra.mapping;

import org.nzbhydra.database.IndexerEntity;


public class Indexer extends IndexerEntity {

    public Indexer(IndexerEntity entity) {
        this.setName(entity.getName());
        this.setId(entity.getId());
    }


}
