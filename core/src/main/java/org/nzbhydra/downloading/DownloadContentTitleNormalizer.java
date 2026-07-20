package org.nzbhydra.downloading;

import java.util.Locale;

final class DownloadContentTitleNormalizer {

    private DownloadContentTitleNormalizer() {
    }

    static String normalize(String title) {
        return title.toLowerCase(Locale.ROOT).replaceAll("[ .\\-_]+", "");
    }
}
