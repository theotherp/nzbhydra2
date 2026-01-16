

package org.nzbhydra.downloading.downloaders.torbox.mapping;

public interface UsenetResponse {
    boolean isSuccess();

    String getError();

    String getDetail();
}
