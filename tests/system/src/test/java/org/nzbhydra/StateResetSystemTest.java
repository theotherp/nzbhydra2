package org.nzbhydra;

import org.apache.commons.lang3.RandomStringUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the state reset facility of ADR-0048: one call returns the instance to the checked-in baseline, whatever
 * state it was in.
 *
 * <p>The mutations are deliberately maximal, and each one covers a case a snapshot restore through
 * {@code PUT /internalapi/config} could not: a secret field ({@code main.proxyPassword}, which
 * {@code GET /internalapi/config} only ever hands back as {@code ***UNCHANGED***}), a nested list
 * ({@code main.sniDisabledFor}), a field no writer in this repository ever touches
 * ({@code main.customVmOptions}), and the two stores outside the config PUT's reach at all - the generic storage
 * including its {@code forUser} keys, and the welcome-shown flag.
 *
 * <p>This class only proves the facility; the suite's own preconditions come from {@link BeforeAll#applyBaseline()}
 * through {@link BaselineExtension}, which re-establishes them before every test and after every class - so the
 * maximal mutations and the wiped baseline below reach no other test.
 */
@SystemTest
public class StateResetSystemTest {

    private static final String UNCHANGED_MARKER = "***UNCHANGED***";
    private static final String GENERIC_STORAGE_ENDPOINT = "/internalapi/genericstorage/";

    @Autowired
    private HydraClient hydraClient;
    @Test
    public void shouldResetConfigToTheBaselineFromAnyPriorState() {
        mutateConfigMaximally("first-round");
        final JsonNode mutated = getConfig();
        //The mutations landed - otherwise the reset below would prove nothing
        assertThat(mutated.get("main").get("proxyPassword").asString()).isEqualTo(UNCHANGED_MARKER);
        assertThat(mutated.get("main").get("sniDisabledFor").size()).isEqualTo(2);
        assertThat(mutated.get("main").get("customVmOptions").asString()).contains("first-round");

        final JsonNode afterFirstReset = resetAndGetConfig();
        assertBaseline(afterFirstReset);

        //Idempotent: a second reset with nothing in between changes nothing
        final JsonNode afterSecondReset = resetAndGetConfig();
        assertThat(afterSecondReset.toString()).isEqualTo(afterFirstReset.toString());

        //Regardless of prior state: different mutations, byte-identical result
        mutateConfigMaximally("second-round");
        final JsonNode afterThirdReset = resetAndGetConfig();
        assertThat(afterThirdReset.toString()).isEqualTo(afterFirstReset.toString());
    }

    @Test
    public void shouldClearGenericStorageAndWelcomeShown() {
        final String globalKey = "reset-global-" + RandomStringUtils.randomAlphabetic(10);
        final String userKey = "reset-user-" + RandomStringUtils.randomAlphabetic(10);
        hydraClient.put(GENERIC_STORAGE_ENDPOINT + globalKey, "globalValue");
        hydraClient.put(GENERIC_STORAGE_ENDPOINT + userKey, "userValue", "forUser=true");
        hydraClient.put("/internalapi/welcomeshown", null);

        final JsonNode mutated = getConfig();
        //Both keys are in the store under whatever name the forUser handling gave them, and the flag is set
        assertThat(mutated.get("genericStorage").size()).isPositive();
        assertThat(mutated.get("genericStorage").toString()).contains(globalKey).contains(userKey);
        assertThat(mutated.get("main").get("welcomeShown").asBoolean()).isTrue();
        assertThat(hydraClient.get(GENERIC_STORAGE_ENDPOINT + globalKey).body()).isEqualTo("globalValue");

        final JsonNode afterReset = resetAndGetConfig();

        assertThat(afterReset.get("genericStorage").size()).isZero();
        assertThat(afterReset.get("main").get("welcomeShown").asBoolean()).isFalse();
        assertThat(hydraClient.get(GENERIC_STORAGE_ENDPOINT + globalKey).body()).isEmpty();
        assertThat(hydraClient.get(GENERIC_STORAGE_ENDPOINT + userKey, "forUser=true").body()).isEmpty();
    }

    /**
     * A reset is bounded like a config PUT and is never a restart, so it is measured against a config PUT made in the
     * same run rather than against a number pulled out of the air.
     */
    @Test
    public void shouldCompleteInTimeComparableToAConfigPut() {
        final JsonNode config = getConfig();
        final long putStarted = System.currentTimeMillis();
        hydraClient.put("/internalapi/config", config.toString()).body();
        final long putMillis = System.currentTimeMillis() - putStarted;

        final long resetStarted = System.currentTimeMillis();
        final JsonNode resetResult = parse(hydraClient.resetToBaseline().body());
        final long resetMillis = System.currentTimeMillis() - resetStarted;

        System.out.printf("Config PUT took %dms, reset took %dms round trip (%dms server side)%n",
                putMillis, resetMillis, resetResult.get("durationMs").asLong());

        assertThat(resetResult.get("successful").asBoolean()).isTrue();
        //A restart of this instance takes tens of seconds; anything in this range cannot have been one
        assertThat(resetMillis).isLessThan(5000L);
        assertThat(resetMillis).isLessThan(Math.max(putMillis * 5, 2000L));
    }

    private void mutateConfigMaximally(String discriminator) {
        final JsonNode config = getConfig();
        final ObjectNode main = (ObjectNode) config.get("main");
        //A secret: it never comes back out of GET /internalapi/config, so no snapshot restore could put it back
        main.put("proxyPassword", "proxy-password-" + discriminator);
        main.put("proxyHost", "proxy-" + discriminator + ".example.org");
        //A nested list
        main.putArray("sniDisabledFor").add(discriminator + ".example.org").add("other-" + discriminator + ".example.org");
        //A field nothing in this repository ever writes, so no baseline built from what writers touch would restore it
        main.put("customVmOptions", "-Dstate.reset.probe=" + discriminator);
        hydraClient.put("/internalapi/config", config.toString()).body();
    }

    private void assertBaseline(JsonNode config) {
        final JsonNode main = config.get("main");
        //config/baseConfig.yml, the one checked-in definition: the state a fresh data folder boots into
        assertThat(main.get("proxyPassword").isNull()).isTrue();
        assertThat(main.get("proxyHost").isNull()).isTrue();
        assertThat(main.get("sniDisabledFor").size()).isZero();
        assertThat(main.get("customVmOptions").isNull()).isTrue();
        assertThat(main.get("apiKey").isNull()).isTrue();
        assertThat(main.get("welcomeShown").asBoolean()).isFalse();
        assertThat(main.get("host").asString()).isEqualTo("0.0.0.0");
        assertThat(main.get("port").asInt()).isEqualTo(5076);
        assertThat(config.get("indexers").size()).isZero();
        assertThat(config.get("genericStorage").size()).isZero();
    }

    private JsonNode resetAndGetConfig() {
        final JsonNode result = parse(hydraClient.resetToBaseline().body());
        assertThat(result.get("successful").asBoolean()).isTrue();
        return getConfig();
    }

    private JsonNode getConfig() {
        return parse(hydraClient.get("/internalapi/config").body());
    }

    private JsonNode parse(String json) {
        return Jackson.JSON_MAPPER.readTree(json);
    }

}
