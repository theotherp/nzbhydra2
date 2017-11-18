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
@Ignore //Only run when needed, we don't want any access to internet from build
public class SslTest {

    //Just test that some sites can be visited that used to cause troubles because of SNI

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
        //Would not work with SNI disabled
        binsearch.callInderWebAccess(URI.create("https://binsearch.info"), String.class);

        nzbGeek.initialize(config, new IndexerEntity());
        //Would not work with SNI enabled
        nzbGeek.callInderWebAccess(URI.create("https://nzbgeek.info/"), String.class);

    }


}