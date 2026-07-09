package org.nzbhydra.downloading.downloaders.nzbget;

import org.junit.jupiter.api.Test;
import org.nzbhydra.downloading.exceptions.DownloaderException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NzbGetTest {

    @Test
    void shouldOnlyReturnNzbGetCategoryNames() {
        NzbGet nzbGet = new NzbGet(null, null, null, null, null, null, null) {
            @Override
            protected ArrayList<LinkedHashMap<String, Object>> callNzbget(String listgroups, Object[] argument) throws DownloaderException {
                return new ArrayList<>(List.of(
                        configEntry("Category1.Name", "books"),
                        configEntry("Category1.DestDir", "/data/books/downloads"),
                        configEntry("Category2.Name", "movies"),
                        configEntry("SpeedControl:Category1.Name", "books"),
                        configEntry("WtfnzbRenamer:Category3.Name", "music"),
                        configEntry("Category.Name", "invalid")
                ));
            }
        };

        List<String> categories = nzbGet.getCategories();

        assertThat(categories).containsExactly("books", "movies");
    }

    @Test
    void shouldReturnUniqueCategoryNames() {
        NzbGet nzbGet = new NzbGet(null, null, null, null, null, null, null) {
            @Override
            protected ArrayList<LinkedHashMap<String, Object>> callNzbget(String listgroups, Object[] argument) throws DownloaderException {
                return new ArrayList<>(List.of(
                        configEntry("Category1.Name", "books"),
                        configEntry("Category2.Name", "movies"),
                        configEntry("Category3.Name", "books")
                ));
            }
        };

        List<String> categories = nzbGet.getCategories();

        assertThat(categories).containsExactly("books", "movies");
    }

    private static LinkedHashMap<String, Object> configEntry(String name, String value) {
        LinkedHashMap<String, Object> entry = new LinkedHashMap<>();
        entry.put("Name", name);
        entry.put("Value", value);
        return entry;
    }

}
