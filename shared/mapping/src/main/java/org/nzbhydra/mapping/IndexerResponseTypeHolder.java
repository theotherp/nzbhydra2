

package org.nzbhydra.mapping;

public interface IndexerResponseTypeHolder {

    enum ResponseType {
        XML,
        JSON
    }

    ResponseType getType();


}
