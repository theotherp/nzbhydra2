package org.nzbhydra.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.web.BootstrappedDataTO;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The OIDC half of {@link UserInfosProvider}: which configured user a logged-in session is recognized as.
 *
 * <p>It used to read the "preferred_username" claim by name, while the login itself resolves the username from the
 * configurable {@code auth.oidcUsernameClaim} (see {@code SecurityConfig.getOidcUserService}). An installation using
 * any other claim therefore authenticated fine and was then recognized as nobody: with restrictSearch on that means
 * {@code maySeeSearch} false, and the search route guard sends a fully authenticated user to the login form. A token
 * without the claim threw a {@link NullPointerException} instead.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserInfosProviderTest {

    private final BaseConfig baseConfig = new BaseConfig();

    @Mock
    private ConfigProvider configProvider;
    @InjectMocks
    private UserInfosProvider testee;

    @BeforeEach
    void setUp() {
        baseConfig.getAuth().setAuthType(AuthType.OIDC);
        baseConfig.getAuth().setRestrictSearch(true);
        baseConfig.getAuth().setRestrictAdmin(true);
        UserAuthConfig user = new UserAuthConfig();
        user.setUsername("hydrauser");
        user.setMaySeeAdmin(true);
        user.setMaySeeStats(true);
        baseConfig.getAuth().setUsers(List.of(user));

        Mockito.when(configProvider.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    void shouldRecognizeTheUserWhenTheUsernameClaimIsNotPreferredUsername() {
        //What a deployment configuring oidcUsernameClaim=email gets: the login resolved "hydrauser" from that claim
        //and built the principal with it as its name attribute, and no preferred_username claim exists at all
        BootstrappedDataTO bootstrappedData = testee.getUserInfos(tokenFor("email",
                Map.of("sub", "0f19", "email", "hydrauser")));

        assertThat(bootstrappedData.getUsername()).isEqualTo("hydrauser");
        assertThat(bootstrappedData.getMaySeeSearch()).isTrue();
        assertThat(bootstrappedData.getMaySeeAdmin()).isTrue();
        //OIDC sessions are logged out at the identity provider, not here
        assertThat(bootstrappedData.getShowLogout()).isFalse();
    }

    @Test
    void shouldStillRecognizeTheUserWhenTheClaimIsPreferredUsername() {
        BootstrappedDataTO bootstrappedData = testee.getUserInfos(tokenFor("preferred_username",
                Map.of("sub", "0f19", "preferred_username", "HydraUser")));

        //Matched case-insensitively, as this provider always did
        assertThat(bootstrappedData.getUsername()).isEqualTo("hydrauser");
        assertThat(bootstrappedData.getMaySeeSearch()).isTrue();
    }

    /**
     * Not a state a login can produce -- {@code SecurityConfig.getOidcUserService} rejects a user that is not
     * configured -- but one a live session reaches when its user is removed from the configuration under it. It used
     * to throw here rather than answer.
     */
    @Test
    void shouldReportAnUnknownOidcUserAsNobodyRatherThanThrowing() {
        BootstrappedDataTO bootstrappedData = testee.getUserInfos(tokenFor("sub", Map.of("sub", "0f19")));

        assertThat(bootstrappedData.getUsername()).isNull();
        assertThat(bootstrappedData.getMaySeeSearch()).isFalse();
        assertThat(bootstrappedData.getMaySeeAdmin()).isFalse();
    }

    private OAuth2AuthenticationToken tokenFor(String usernameClaim, Map<String, Object> claims) {
        OidcIdToken idToken = new OidcIdToken("token-value", Instant.now(), Instant.now().plusSeconds(60), claims);
        DefaultOidcUser principal = new DefaultOidcUser(AuthorityUtils.createAuthorityList("ROLE_USER"), idToken,
                usernameClaim);
        return new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "nzbhydra2");
    }

}
