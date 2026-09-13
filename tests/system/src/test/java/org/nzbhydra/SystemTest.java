package org.nzbhydra;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Every system test class in this module carries this annotation and nothing else in its place.
 *
 * <p>It is the Spring test context plus {@link BaselineExtension}, and the point of bundling them is that the two
 * cannot be separated: a class that wires the context but not the extension is a class that inherits whatever the
 * previously scheduled class left behind, which is the failure mode FM-140 removed. The Java phase runs under
 * {@code -Dsurefire.runOrder=random} (see {@code misc/run_gui_systemtest.py}), so there is no "previously scheduled
 * class" to rely on.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Documented
@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
@ExtendWith(BaselineExtension.class)
public @interface SystemTest {
}
