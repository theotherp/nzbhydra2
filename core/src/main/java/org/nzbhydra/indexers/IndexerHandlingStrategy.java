package org.nzbhydra.indexers;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.springframework.beans.factory.BeanFactory;

public interface IndexerHandlingStrategy<T extends Indexer> {

    boolean handlesIndexerConfig(IndexerConfig config);

    String getName();

}
