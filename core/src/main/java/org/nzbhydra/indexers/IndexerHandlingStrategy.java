package org.nzbhydra.indexers;

import org.nzbhydra.config.IndexerConfig;

public interface IndexerHandlingStrategy {

    public boolean handlesIndexerConfig(IndexerConfig config);

    public Class<? extends Indexer> getIndexerClass();

}
