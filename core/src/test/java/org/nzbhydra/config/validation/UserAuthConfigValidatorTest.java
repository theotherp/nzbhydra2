package org.nzbhydra.config.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.config.validation.SensitiveDataConfigValidator.UNCHANGED_MARKER;

/**
 * Covers the by-username matching of {@link UserAuthConfigValidator}, driven through {@link AuthConfigValidator} the
 * way {@link BaseConfigValidator#prepareForSaving} drives it. Neither needs a Spring context.
 */
class UserAuthConfigValidatorTest {

    private final UserAuthConfigValidator testee = new UserAuthConfigValidator();
    private final AuthConfigValidator authConfigValidator = new AuthConfigValidator();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authConfigValidator, "userAuthConfigValidator", testee);
    }

    private static UserAuthConfig user(String username, String password) {
        final UserAuthConfig userAuthConfig = new UserAuthConfig();
        userAuthConfig.setUsername(username);
        userAuthConfig.setPassword(password);
        return userAuthConfig;
    }

    private static BaseConfig configWithUsers(UserAuthConfig... users) {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.getAuth().setUsers(new ArrayList<>(List.of(users)));
        return baseConfig;
    }

    @Test
    void shouldResolveEachSurvivingPasswordByUsernameWhenAUserIsRemoved() {
        final BaseConfig oldConfig = configWithUsers(
            user("a", "{bcrypt}a-hash"),
            user("b", "{bcrypt}b-hash"),
            user("c", "{bcrypt}c-hash"));
        final BaseConfig newConfig = configWithUsers(user("a", UNCHANGED_MARKER), user("c", UNCHANGED_MARKER));

        authConfigValidator.prepareForSaving(oldConfig, newConfig.getAuth());

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}a-hash");
        assertThat(newConfig.getAuth().getUsers().get(1).getPassword())
            .as("The user that shifted into index 1 must keep its own password, not the removed user's")
            .isEqualTo("{bcrypt}c-hash");
    }

    @Test
    void shouldResolveARenamedUsersNeighbourByUsername() {
        final BaseConfig oldConfig = configWithUsers(user("rename-me", "{bcrypt}renamed-hash"), user("bystander", "{bcrypt}bystander-hash"));
        final BaseConfig newConfig = configWithUsers(user("renamed", "{bcrypt}renamed-hash"), user("bystander", UNCHANGED_MARKER));

        authConfigValidator.prepareForSaving(oldConfig, newConfig.getAuth());

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}renamed-hash");
        assertThat(newConfig.getAuth().getUsers().get(1).getPassword()).isEqualTo("{bcrypt}bystander-hash");
    }

    @Test
    void shouldLeaveTheMarkerInPlaceForAnUnknownUsername() {
        final BaseConfig oldConfig = configWithUsers(user("a", "{bcrypt}a-hash"));
        final BaseConfig newConfig = configWithUsers(user("never seen", UNCHANGED_MARKER));

        authConfigValidator.prepareForSaving(oldConfig, newConfig.getAuth());

        assertThat(newConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo(UNCHANGED_MARKER);
    }

    @Test
    void shouldHashANewPlaintextPasswordAndMigrateANoopOne() {
        final BaseConfig oldConfig = configWithUsers();
        final UserAuthConfig plaintext = user("a", "plaintext");
        final UserAuthConfig noop = user("b", UserAuthConfig.PASSWORD_ID + "legacy");
        final UserAuthConfig alreadyHashed = user("c", "{bcrypt}already-hashed");

        testee.prepareForSaving(oldConfig, plaintext);
        testee.prepareForSaving(oldConfig, noop);
        testee.prepareForSaving(oldConfig, alreadyHashed);

        assertThat(plaintext.getPassword()).startsWith("{bcrypt}").isNotEqualTo("{bcrypt}plaintext");
        assertThat(noop.getPassword()).startsWith("{bcrypt}").doesNotContain("legacy");
        assertThat(alreadyHashed.getPassword()).isEqualTo("{bcrypt}already-hashed");
    }

    @Test
    void shouldMaskAHashedPasswordForDisplay() {
        assertThat(testee.updateAfterLoading(user("a", "{bcrypt}a-hash")).getPassword()).isEqualTo(UNCHANGED_MARKER);
        assertThat(testee.updateAfterLoading(user("b", UserAuthConfig.PASSWORD_ID + "legacy")).getPassword()).isEqualTo(UNCHANGED_MARKER);
    }
}
