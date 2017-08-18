package org.nzbhydra.migration;

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
public class SqliteMigrationComponentTest {

    @Autowired
    FromPythonMigration testee;

    @Test
    public void shouldMigrate() throws Exception {
        testee.migrateFromUrl("http://127.0.0.1:5075/");
    }


}