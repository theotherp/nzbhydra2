

package org.nzbhydra;

import java.io.File;
import java.io.FileFilter;
import java.io.IOException;

public class DirectoryTreeUpTraversal {

    public static File walkUpDirectoryTreeUntilFound(FileFilter filenameFilter, File startFolder) throws IOException {
        File found = null;
        File temp = startFolder.getCanonicalFile();
        do {
            final File[] files = temp.getCanonicalFile().listFiles(filenameFilter);
            if (files != null && files.length > 0) {
                return files[0];
            }
            temp = temp.getCanonicalFile().getParentFile();
        } while (temp != null);
        return null;
    }
}
