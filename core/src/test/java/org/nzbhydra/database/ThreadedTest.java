package org.nzbhydra.database;

import com.google.common.base.Stopwatch;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureDataJpa;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
@AutoConfigureDataJpa
//@DataJpaTest
@Disabled
public class ThreadedTest {

    @Autowired
    SearchRepository searchRepository;

    @Test
    void executeParallelSaves() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(50);
        for (int i = 0; i < 50; i++) {
            pool.execute(() -> {
                Stopwatch stopwatch = Stopwatch.createStarted();
                for (int i1 = 0; i1 < 100; i1++) {
                    SearchEntity searchEntity = new SearchEntity();
                    searchEntity.setQuery("query");
                    searchEntity.setSearchType(SearchType.SEARCH);
                    searchEntity.setEpisode("123");
                    searchEntity.setSeason(234);
                    searchRepository.save(searchEntity);
                }
                System.out.println("Saving 100 took " + stopwatch.elapsed(TimeUnit.MILLISECONDS) + "ms");
            });
        }
        pool.awaitTermination(10, TimeUnit.SECONDS);

    }


}
