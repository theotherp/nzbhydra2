package org.nzbhydra.searching.searchmodules;

import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.searching.IndexerConfig;

import javax.persistence.Transient;

public abstract class AbstractSearchModule extends IndexerEntity implements SearchModule {

    @Transient
    protected IndexerConfig config;

    public abstract void initialize(IndexerConfig config);


}
