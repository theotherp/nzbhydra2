package org.nzbhydra.indexers;

public enum IndexerAccessResult {
    SUCCESSFUL,
    CONNECTION_ERROR,
    API_ERROR,
    AUTH_ERROR,
    HYDRA_ERROR,
    UNKNOWN
}
