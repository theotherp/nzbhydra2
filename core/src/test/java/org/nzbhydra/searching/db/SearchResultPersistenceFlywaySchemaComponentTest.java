package org.nzbhydra.searching.db;

import org.springframework.test.context.TestPropertySource;

/**
 * Runs the same checks as {@link SearchResultPersistenceComponentTest} but against a database created by the Flyway
 * migrations (including V8) instead of by Hibernate. This makes sure the entity mapping works against the migrated
 * schema. Hibernate's schema validation can't be used because unrelated sequences created by V2 don't match their
 * entities' allocation sizes.
 */
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:flywayschematest;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,DATA,KEY",
    "spring.flyway.enabled=true",
    "spring.jpa.generate-ddl=false",
    "spring.jpa.hibernate.ddl-auto=none"
})
public class SearchResultPersistenceFlywaySchemaComponentTest extends SearchResultPersistenceComponentTest {
}
