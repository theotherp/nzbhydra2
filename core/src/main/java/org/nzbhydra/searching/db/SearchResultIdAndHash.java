package org.nzbhydra.searching.db;

/**
 * Projection of a {@link SearchResultEntity} to its internal ID and its externally visible hash.
 */
public interface SearchResultIdAndHash {

    long getId();

    long getHash();
}
