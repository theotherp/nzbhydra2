package org.nzbhydra.tests;

import org.nzbhydra.NzbHydra;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target(TYPE)
@Retention(RUNTIME)
@Documented
@SpringBootTest(webEnvironment = WebEnvironment.DEFINED_PORT, classes = NzbHydra.class)
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:config/application.properties")
@TestExecutionListeners(listeners = {DependencyInjectionTestExecutionListener.class, ScreenshotTakingTestExecutionListener.class}, mergeMode = TestExecutionListeners.MergeMode.MERGE_WITH_DEFAULTS)
public @interface NzbhydraMockMvcTest {
}
