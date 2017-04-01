package org.nzbhydra.tests.searching.infos;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.TmdbHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.junit4.SpringRunner;

//import org.nzbhydra.searching.infos.TmdbSearchResult;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = {InfoProvider.class, TmdbHandler.class})
//@ContextConfiguration(classes = {Searcher.class, DuplicateDetector.class, Newznab.class, SearchModuleConfigProvider.class, SearchModuleProvider.class, AppConfig.class, SearchResultRepository.class, IndexerRepository.class})
//@Configuration
//@DataJpaTest
//@ConfigurationProperties
//@EnableConfigurationProperties
//@TestPropertySource(locations = "classpath:/org/nzbhydra/tests/searching/application.properties")
public class InfosIntegrationTest {

    @Autowired
    private InfoProvider infoProvider;


    @Test
    public void shouldSearch() throws Exception {
        infoProvider.convert("tt0172495", InfoProvider.IdType.IMDB);

    }

    @Primary
    private class TmdbHandlerMock extends TmdbHandler {
//        @Override
//        public TmdbSearchResult fromTitle(String title, Integer year) throws InfoProviderException {
//
//        Random random = new Random();
//        TmdbSearchResult result= new TmdbSearchResult("timdb" + random.nextInt(), "imdb", title);
//            return result;
//        }
    }

}