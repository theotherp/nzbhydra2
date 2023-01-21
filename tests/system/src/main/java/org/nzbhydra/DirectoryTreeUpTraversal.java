/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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
