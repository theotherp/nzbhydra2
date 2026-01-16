

package org.nzbhydra.downloading;

/**
 * Thrown when a torrent is to be downloaded but redirects to a magnet link
 */
public class MagnetLinkRedirectException extends Exception {

    private String magnetLink;

    public MagnetLinkRedirectException(String magnetLink) {
        this.magnetLink = magnetLink;
    }

    public String getMagnetLink() {
        return magnetLink;
    }
}
