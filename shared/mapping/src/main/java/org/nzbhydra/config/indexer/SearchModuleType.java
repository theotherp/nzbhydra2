

package org.nzbhydra.config.indexer;

public enum SearchModuleType {
    ANIZB,
    BINSEARCH,
    NEWZNAB,
    WTFNZB,
    NZBINDEX,
    NZBINDEX_API,
    NZBINDEX_BETA,
    NZBKING,
    TORZNAB,
    DEVONLY,
    //Not used in the backend sources but provided by the UI when indexers are imported from jackett or prowlarr or such. Must not be deleted or otherwise the mapping fails when the UI sends the request to the backend
    IMPORT_CONFIG,
    TORBOX
}
