package org.nzbhydra.downloader.sabnzbd;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.DownloaderConfig;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import java.util.List;

import static org.junit.Assert.assertEquals;

@SuppressWarnings("SpringJavaAutowiringInspection")
@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)

public class SabnzbdComponentTest {

    private DownloaderConfig downloaderConfig;

    private Sabnzbd sabnzbd;

    @Before
    public void setUp() {
        downloaderConfig = new DownloaderConfig();
        downloaderConfig.setUrl("http://127.0.0.1:8085/sabnzbd");
        downloaderConfig.setApiKey("63e1c248a4a84c63e44b5a2ce9153cfe");
        sabnzbd = new Sabnzbd();
        sabnzbd.intialize(downloaderConfig);
    }


    @Test
    public void shouldGetQueue() throws Exception {
        List<String> categories = sabnzbd.getCategories();
        assertEquals("*", categories.get(0));
    }


}