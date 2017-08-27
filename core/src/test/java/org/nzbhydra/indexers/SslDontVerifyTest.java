package org.nzbhydra.indexers;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.IndexerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import java.net.URI;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@DataJpaTest
public class SslDontVerifyTest {

    @Autowired
    IndexerWebAccess webAccess;

    @Test
    public void shouldNotVerify() throws Exception {
        webAccess.get(URI.create("https://binsearch.info"), String.class, new IndexerConfig());
        //new OkHttpClient.Builder().build().newCall(new Request.Builder().url("https://binsearch.info").build()).execute();
    }


}