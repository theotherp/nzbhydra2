package org.nzbhydra.database;

import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.id.enhanced.SequenceStyleGenerator;
import org.junit.jupiter.api.Test;
import org.nzbhydra.NzbHydra;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The tests let Hibernate create the schema, which always matches the entities. Users get the schema from the Flyway
 * migrations. Compares the increment Hibernate expects for each sequence with the one the migrations create.
 */
@SpringBootTest(classes = NzbHydra.class)
class SequenceIncrementComponentTest {

    private static final String URL = "jdbc:h2:mem:sequenceincrementtest;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,DATA,KEY";

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void shouldMigrateSequencesToTheIncrementHibernateUses() throws SQLException {
        Map<String, Long> hibernateIncrements = new HashMap<>();
        entityManagerFactory.unwrap(SessionFactoryImplementor.class).getMappingMetamodel().forEachEntityDescriptor(descriptor -> {
            if (descriptor.getGenerator() instanceof SequenceStyleGenerator generator) {
                hibernateIncrements.put(generator.getDatabaseStructure().getPhysicalName().getObjectName().getText().toUpperCase(), (long) generator.getDatabaseStructure().getIncrementSize());
            }
        });
        assertThat(hibernateIncrements).containsEntry("SEARCH_SEQ", 1L).containsEntry("SEARCHRESULT_SEQ", 50L);

        Map<String, Long> migratedIncrements = new HashMap<>();
        try (Connection connection = DriverManager.getConnection(URL, "sa", "sa")) {
            Flyway.configure().dataSource(URL, "sa", "sa").locations("classpath:migration").load().migrate();
            try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery("SELECT SEQUENCE_NAME, INCREMENT FROM INFORMATION_SCHEMA.SEQUENCES")) {
                while (rs.next()) {
                    migratedIncrements.put(rs.getString(1), rs.getLong(2));
                }
            }
            try (Statement statement = connection.createStatement()) {
                statement.execute("DROP ALL OBJECTS");
            }
        }

        assertThat(migratedIncrements).containsAllEntriesOf(hibernateIncrements);
    }
}
