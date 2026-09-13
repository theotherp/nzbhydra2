package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.NewznabParameters;

import java.util.Random;

/**
 * Everything a {@link ResponseBehaviour} may need to build its response.
 *
 * <p>Every request gets its own unseeded {@link Random}. Seeding it (for example from the query) was considered but
 * rejected: the deterministic fixtures do not use randomness at all, so they are stable either way, while the generated
 * scenarios would suddenly return byte identical titles for repeated searches, which is not how the old mock server
 * behaved. Tests pass in their own seeded {@link Random} when they need reproducible values.</p>
 */
public record MockContext(NewznabParameters params, IndexerPersona persona, Random random, String host, int port,
                          Sleeper sleeper) {

    public static MockContext of(NewznabParameters params, String host, int port) {
        return new MockContext(params, IndexerPersona.of(params), new Random(), host, port, Sleeper.REAL);
    }

    public String query() {
        return params.getQ();
    }

    public String apikey() {
        return params.getApikey();
    }

    public int offset() {
        return params.getOffset() == null ? 0 : params.getOffset();
    }

    public int limit() {
        return params.getLimit() == null ? 0 : params.getLimit();
    }

    /**
     * The old chain computed this once, before the first scenario that uses it, and passed it into every generated response.
     */
    public boolean generateDuplicates() {
        return query() != null && query().startsWith("duplicates");
    }

    public String hostUrl() {
        return "http://" + host + ":" + port;
    }

}
