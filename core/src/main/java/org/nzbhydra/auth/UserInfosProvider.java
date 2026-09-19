package org.nzbhydra.auth;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.safeconfig.SafeConfig;
import org.nzbhydra.web.BootstrappedDataTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;

@Component
public class UserInfosProvider {

    @Autowired
    private ConfigProvider configProvider;

    public BootstrappedDataTO getUserInfos(Principal principal) {
        BootstrappedDataTO bootstrappedData = new BootstrappedDataTO();
        AuthConfig auth = configProvider.getBaseConfig().getAuth();

        boolean authConfigured = auth.getAuthType() != AuthType.NONE && !auth.getUsers().isEmpty();
        boolean adminRestricted = auth.isRestrictAdmin() && authConfigured;
        boolean statsRestricted = auth.isRestrictStats() && authConfigured;
        boolean searchRestricted = auth.isRestrictSearch() && authConfigured;
        boolean detailsDlRestricted = auth.isRestrictDetailsDl() && authConfigured;
        boolean indexerSelectionRestricted = auth.isRestrictIndexerSelection() && authConfigured;
        boolean showIndexerSelection;
        String username;
        boolean maySeeAdmin;
        boolean maySeeStats;
        boolean maySeeDetailsDl;
        boolean showLogout = true;
        Optional<UserAuthConfig> user;
        if (principal instanceof OAuth2AuthenticationToken token) {
            //The principal's own name, which is the username the login already resolved and loaded the Hydra user
            //with: SecurityConfig.getOidcUserService() builds the principal with auth.oidcUsernameClaim as its name
            //attribute, and the client registration uses the same claim as its userNameAttributeName. Reading
            //"preferred_username" here instead meant that an installation configuring another claim (e.g. email)
            //authenticated fine and then matched no configured user here, so maySeeSearch was false and the search
            //route guard sent that user to the login form. It also could not throw: an arbitrary claim may be absent
            //from a token, which made the old .toString() a NullPointerException, while a principal's name always
            //exists - Spring refuses to build one whose name attribute is missing.
            String principalName = token.getPrincipal().getName();
            //equalsIgnoreCase mirrors the login: HydraUserDetailsManager keeps its users in a
            //TreeMap(String.CASE_INSENSITIVE_ORDER), so this recognizes exactly the spellings that authenticate
            user = auth.getUsers().stream().filter(x -> principalName.equalsIgnoreCase(x.getUsername())).findFirst();
            showLogout = false;
        } else {
            user = principal == null ? Optional.empty() : auth.getUsers().stream().filter(x -> Objects.equals(x.getUsername(), principal.getName())).findFirst();
        }
        if (user.isPresent()) {
            maySeeAdmin = user.get().isMaySeeAdmin();
            maySeeStats = user.get().isMaySeeStats() || user.get().isMaySeeAdmin();
            maySeeDetailsDl = user.get().isMaySeeDetailsDl() || !detailsDlRestricted || maySeeAdmin;
            showIndexerSelection = user.get().isShowIndexerSelection() || !indexerSelectionRestricted || maySeeAdmin;
            username = user.get().getUsername();
        } else if (!authConfigured) {
            maySeeAdmin = true;
            maySeeStats = true;
            maySeeDetailsDl = true;
            showIndexerSelection = true;
            username = null;
        } else {
            maySeeAdmin = false;
            maySeeStats = false;
            maySeeDetailsDl = !detailsDlRestricted;
            showIndexerSelection = !indexerSelectionRestricted;
            username = null;
        }

        bootstrappedData.setAuthType(auth.getAuthType().name());
        bootstrappedData.setAuthConfigured(authConfigured);
        bootstrappedData.setShowLogout(showLogout);
        bootstrappedData.setAdminRestricted(adminRestricted);
        bootstrappedData.setSearchRestricted(searchRestricted);
        bootstrappedData.setStatsRestricted(statsRestricted);
        bootstrappedData.setShowIndexerSelection(showIndexerSelection);
        bootstrappedData.setMaySeeAdmin(maySeeAdmin);
        bootstrappedData.setMaySeeStats(maySeeStats);
        bootstrappedData.setMaySeeDetailsDl(maySeeDetailsDl);
        bootstrappedData.setMaySeeSearch(!auth.isRestrictSearch() || !authConfigured || user.isPresent());
        bootstrappedData.setUsername(username);
        bootstrappedData.setServerTimeZone(ZoneId.systemDefault().getId());

        return bootstrappedData;
    }

    public BootstrappedDataTO getBootstrapData(Principal principal, String baseUrl) {
        BootstrappedDataTO bootstrappedData = getUserInfos(principal);
        bootstrappedData.setSafeConfig(new SafeConfig(configProvider.getBaseConfig()));
        bootstrappedData.setBaseUrl(normalizeBaseUrl(baseUrl));
        return bootstrappedData;
    }

    private String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank() || "/".equals(baseUrl)) {
            return "/";
        }
        return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    }

}
