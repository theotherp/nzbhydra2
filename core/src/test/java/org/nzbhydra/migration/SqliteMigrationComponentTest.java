package org.nzbhydra.migration;

import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@DataJpaTest
@Ignore // Doesn't run since upgrade to Spring Boot 2.1
public class SqliteMigrationComponentTest {

    @Autowired
    FromPythonMigration testee;

    @Test
    public void shouldMigrate() throws Exception {
        testee.migrateFromUrl("http://127.0.0.1:5075/", true, false);
    }


}