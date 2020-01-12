package org.nzbhydra.indexers;

import org.nzbhydra.config.indexer.IndexerConfig;

public interface IndexerHandlingStrategy {

    boolean handlesIndexerConfig(IndexerConfig config);

    Class<? extends Indexer> getIndexerClass();

}
