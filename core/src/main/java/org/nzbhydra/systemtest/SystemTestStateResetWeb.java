package org.nzbhydra.systemtest;

import com.google.common.base.Stopwatch;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Returns a running instance to a defined known state in one call, for system tests (ADR-0048).
 *
 * <p>The baseline is {@code config/baseConfig.yml}, read from the classpath of the running instance - the same file
 * {@link ConfigReaderWriter#initializeIfNeeded(java.io.File)} copies into an empty data folder. That file is the one
 * checked-in definition; no second copy of the baseline exists, and nothing the client sends contributes a value.
 * Note that a reset applies the YAML verbatim and is therefore <em>not</em> identical to a fresh boot: booting on an
 * empty data folder additionally runs {@code MainConfigValidator.initializeNewConfig}, which generates
 * {@code main.apiKey} - this endpoint never does, so after a reset the key is {@code null} (the YAML's literal value)
 * and a caller that needs authenticated API access must establish a key itself, as the test fixtures do.
 *
 * <p>That last point is the reason this exists rather than a snapshot restore through
 * {@code PUT /internalapi/config}. {@code GET /internalapi/config} masks secrets as
 * {@code ***UNCHANGED***}, and since FM-068 a save is refused when such a marker cannot be matched to a stored
 * record - which is exactly the case after the records it came from have been replaced (ADR-0020). Here the baseline
 * values, secrets included, come out of the YAML as real values and go in through
 * {@link BaseConfigHandler#replace(BaseConfig)}, which never runs the marker-resolving validator at all.
 *
 * <p>A reset is bounded like a config PUT: replace the in-memory config, fire the change event, write the file. It is
 * never a restart, and it does not touch the history and stats tables - tests that write those namespace their own
 * data instead.
 *
 * <p>{@code genericStorage} (including the {@code forUser}-suffixed keys written by
 * {@link org.nzbhydra.genericstorage.GenericStorageWeb}) and {@code main.welcomeShown} are fields of
 * {@link BaseConfig}, so replacing the whole config resets them along with everything else.
 *
 * <p>The gate is a runtime check against the active profiles, not a class-level {@code @Profile}: the handler answers
 * a body-less 404 unless the {@code systemtest} profile is active. (Not perfectly indistinguishable from an unmapped
 * path: method security runs first, so an authenticated non-admin sees 403, and a genuinely unmapped path carries
 * Spring's error body - but the refused path leaks no content and logs nothing.) It is deliberately
 * not {@code @Profile}, because that is a <em>build-time</em> condition under Spring AOT. The native image is compiled
 * with {@code mvn -Pnative,strictReflection native:compile} and {@code process-aot} configures no profiles
 * ({@code core/pom.xml}), so AOT runs under {@code spring.profiles.active=default}
 * ({@code config/application.properties}); a {@code @Profile}-conditional bean is then simply never emitted into the
 * generated bean definitions, and no runtime {@code spring_profiles_active} can bring it back. CI's system-test jobs
 * run a native core, so a {@code @Profile} gate would have made this endpoint permanently absent exactly where the
 * tests need it. The runtime check behaves identically in both images. {@code SystemTestStateResetWebTest} proves both
 * halves of it.
 */
@RestController
public class SystemTestStateResetWeb {

    public static final String RESET_ENDPOINT = "/internalapi/systemtest/reset";

    private static final Profiles SYSTEMTEST = Profiles.of("systemtest");

    private static final Logger logger = LoggerFactory.getLogger(SystemTestStateResetWeb.class);

    @Autowired
    private BaseConfigHandler baseConfigHandler;

    @Autowired
    private Environment environment;

    private final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    @Secured({"ROLE_ADMIN"})
    @PostMapping(value = RESET_ENDPOINT, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ResetResult> reset() throws IOException {
        if (!environment.acceptsProfiles(SYSTEMTEST)) {
            //Not an error message: a caller outside a system test must not be able to tell this path exists
            return ResponseEntity.notFound().build();
        }
        final Stopwatch stopwatch = Stopwatch.createStarted();
        logger.info("Resetting state to the checked-in baseline");
        final BaseConfig baseline = configReaderWriter.originalConfig();
        baseConfigHandler.replace(baseline);
        baseConfigHandler.save(true);
        final long durationMs = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        logger.info("Reset state to the checked-in baseline in {}ms", durationMs);
        return ResponseEntity.ok(new ResetResult(true, durationMs));
    }

    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ResetResult {

        private boolean successful;
        private long durationMs;
    }

}
