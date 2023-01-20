package org.nzbhydra.indexers;

import org.nzbhydra.config.indexer.IndexerConfig;

public interface IndexerHandlingStrategy<T extends Indexer> {

    boolean handlesIndexerConfig(IndexerConfig config);

    String getName();

}
