package org.nzbhydra;

import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Establishes {@link BeforeAll#applyBaseline()}'s configuration before every test and once more after every class that
 * ran one.
 *
 * <p>The suite used to get its baseline from a {@code @PostConstruct} that ran once per JVM fork, when whichever class
 * was scheduled first built the shared Spring context. "Baseline applied" was therefore a property of the fork, not of
 * the test: half the classes re-established it themselves, the other half free-rode on their predecessors, and several
 * left state behind. Running the suite in a different order moved the failures around. This extension makes every class
 * pay for its own preconditions, which is what makes {@code -Dsurefire.runOrder=random} a gate rather than a lottery.
 *
 * <p>Registered class-level through {@code @SystemTest}, so its {@code beforeEach} runs before the test class's own
 * {@code @BeforeEach} methods: a class that layers its own downloader or indexer on top of the baseline still gets the
 * baseline first.
 *
 * <p>The {@code afterAll} call is what protects the next phase rather than the next test. CI runs the Java suite and
 * then the Playwright suite against the same instance (.github/workflows/system-test.yml), so the state the last Java
 * class leaves behind is the state the first Playwright spec inherits.
 *
 * <p>Establishing, never restoring a snapshot: see the contract on {@link BeforeAll#applyBaseline()}.
 */
public class BaselineExtension implements BeforeEachCallback, AfterAllCallback {

    private static final ExtensionContext.Namespace NAMESPACE = ExtensionContext.Namespace.create(BaselineExtension.class);
    private static final String ANY_TEST_RAN = "anyTestRan";

    @Override
    public void beforeEach(ExtensionContext context) {
        classStore(context).put(ANY_TEST_RAN, Boolean.TRUE);
        baseline(context).applyBaseline();
    }

    /**
     * Only for a class that actually ran something. A class whose {@code @BeforeAll} aborted on an assumption - the two
     * Arr classes, against an instance with no Sonarr and no Radarr - changed nothing, so there is nothing to
     * re-establish, and JUnit runs {@code afterAll} callbacks for it all the same. Writing here would turn its clean
     * skip into an error the moment the write failed, which is exactly what an environment missing its Arrs is likely
     * to be missing other things too.
     */
    @Override
    public void afterAll(ExtensionContext context) {
        if (!Boolean.TRUE.equals(context.getStore(NAMESPACE).get(ANY_TEST_RAN))) {
            return;
        }
        baseline(context).applyBaseline();
    }

    private ExtensionContext.Store classStore(ExtensionContext context) {
        return context.getParent().orElse(context).getStore(NAMESPACE);
    }

    private BeforeAll baseline(ExtensionContext context) {
        return SpringExtension.getApplicationContext(context).getBean(BeforeAll.class);
    }
}
