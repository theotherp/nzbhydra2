package org.nzbhydra.h2legacy;

/**
 * Marker class of the {@code h2legacy} module.
 * <p>
 * The module has no logic of its own. It only exists to ship H2 2.1.214 relocated from {@code org.h2} to
 * {@code org.nzbhydra.h2legacy.org.h2} so that the old engine can be loaded in the same JVM as the bundled H2
 * 2.4.240 (see {@code DatabaseRecreation} in the core module). Use the relocated driver explicitly:
 * <pre>
 * new org.nzbhydra.h2legacy.org.h2.Driver().connect(url, properties)
 * </pre>
 * Never go through {@link java.sql.DriverManager}: the relocated {@code Driver} registers itself on class
 * initialization and would otherwise be a candidate for {@code jdbc:h2:} URLs meant for the bundled engine.
 * <p>
 * The module contains one patched H2 class, {@code org.h2.mvstore.type.MetaType} in {@code src/main/java}; see its
 * javadoc for why the relocation alone is not enough.
 */
public final class H2Legacy {

    /**
     * Package name the H2 classes were relocated to.
     */
    public static final String RELOCATED_PACKAGE = "org.nzbhydra.h2legacy.org.h2";

    private H2Legacy() {
    }
}
