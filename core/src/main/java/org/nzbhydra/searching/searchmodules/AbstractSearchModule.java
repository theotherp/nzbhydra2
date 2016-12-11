package org.nzbhydra.searching.searchmodules;

import org.nzbhydra.searching.IndexerConfig;

public abstract class AbstractSearchModule implements SearchModule {

    protected IndexerConfig config;


    public abstract void initialize(IndexerConfig config);


}
