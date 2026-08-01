package org.nzbhydra.downloading.downloaders.nzbget;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.webaccess.Ssl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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

    @Test
    void shouldInitializeJsonRpcClient() {
        Ssl ssl = mock(Ssl.class);
        when(ssl.getVerificationStateForHost("localhost")).thenReturn(Ssl.SslVerificationState.DISABLED_HOST);
        when(ssl.getAllTrustingSslContext()).thenReturn(null);
        DownloaderConfig config = new DownloaderConfig();
        config.setUrl("http://localhost/nzbget/");

        NzbGet nzbGet = new NzbGet(null, null, null, null, null, ssl, null);

        assertThatCode(() -> nzbGet.initialize(config)).doesNotThrowAnyException();
    }

    private static LinkedHashMap<String, Object> configEntry(String name, String value) {
        LinkedHashMap<String, Object> entry = new LinkedHashMap<>();
        entry.put("Name", name);
        entry.put("Value", value);
        return entry;
    }

}
