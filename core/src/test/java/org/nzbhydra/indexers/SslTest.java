package org.nzbhydra.indexers;

import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import java.net.URI;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@DataJpaTest
@Ignore //Until issue is resolved. See https://github.com/square/okhttp/issues/3573
public class SslTest {

    //JUst test that some sites can be visited that used to cause troubles

    @Autowired
    IndexerWebAccess webAccess;
    @Autowired
    private Binsearch binsearch;
    @Autowired
    private NzbGeek nzbGeek;
    @Autowired
    private ConfigProvider configProvider;

    @Test
    public void shouldBeAbleToAccessSSL() throws Exception {
        configProvider.getBaseConfig().getMain().setVerifySsl(false);

        IndexerConfig config = new IndexerConfig();
        config.setTimeout(99999);
        binsearch.initialize(config, new IndexerEntity());
        binsearch.callInderWebAccess(URI.create("https://binsearch.info"), String.class);

        nzbGeek.initialize(config, new IndexerEntity());
        nzbGeek.callInderWebAccess(URI.create("https://nzbgeek.info/"), String.class);

    }


}