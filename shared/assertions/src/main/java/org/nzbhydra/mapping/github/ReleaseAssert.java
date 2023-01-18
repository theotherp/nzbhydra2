package org.nzbhydra.mapping.github;

/**
 * {@link Release} specific assertions - Generated by CustomAssertionGenerator.
 * <p>
 * Although this class is not final to allow Soft assertions proxy, if you wish to extend it,
 * extend {@link AbstractReleaseAssert} instead.
 */
@jakarta.annotation.Generated(value = "assertj-assertions-generator")
public class ReleaseAssert extends AbstractReleaseAssert<ReleaseAssert, Release> {

    /**
     * Creates a new <code>{@link ReleaseAssert}</code> to make assertions on actual Release.
     *
     * @param actual the Release we want to make assertions on.
     */
    public ReleaseAssert(Release actual) {
        super(actual, ReleaseAssert.class);
    }

    /**
     * An entry point for ReleaseAssert to follow AssertJ standard <code>assertThat()</code> statements.<br>
     * With a static import, one can write directly: <code>assertThat(myRelease)</code> and get specific assertion with code completion.
     *
     * @param actual the Release we want to make assertions on.
     * @return a new <code>{@link ReleaseAssert}</code>
     */
    @org.assertj.core.util.CheckReturnValue
    public static ReleaseAssert assertThat(Release actual) {
        return new ReleaseAssert(actual);
    }
}