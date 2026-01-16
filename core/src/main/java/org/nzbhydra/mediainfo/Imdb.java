

package org.nzbhydra.mediainfo;

public class Imdb {

    public static String withTt(String id) {
        if (id == null) {
            return null;
        }
        return "tt" + id.replaceAll("tt", "");
    }

    public static String withoutTt(String id) {
        if (id == null) {
            return null;
        }
        return id.replaceAll("tt", "");
    }
}
