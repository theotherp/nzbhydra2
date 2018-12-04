package org.nzbhydra.auth;

import org.nzbhydra.config.AuthConfig;
import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.UserAuthConfig;
import org.nzbhydra.web.BootstrappedDataTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.security.Principal;
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
        Optional<UserAuthConfig> user = principal == null ? Optional.empty() : auth.getUsers().stream().filter(x -> Objects.equals(x.getUsername(), principal.getName())).findFirst();
        if (user.isPresent()) {
            maySeeAdmin = user.get().isMaySeeAdmin();
            maySeeStats = user.get().isMaySeeStats() || user.get().isMaySeeAdmin();
            maySeeDetailsDl = user.get().isMaySeeDetailsDl() || !detailsDlRestricted;
            showIndexerSelection = user.get().isShowIndexerSelection() || !indexerSelectionRestricted;
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
        bootstrappedData.setAdminRestricted(adminRestricted);
        bootstrappedData.setSearchRestricted(searchRestricted);
        bootstrappedData.setStatsRestricted(statsRestricted);
        bootstrappedData.setShowIndexerSelection(showIndexerSelection);
        bootstrappedData.setMaySeeDetailsDl(maySeeDetailsDl);
        bootstrappedData.setMaySeeAdmin(maySeeAdmin);
        bootstrappedData.setMaySeeStats(maySeeStats);
        bootstrappedData.setMaySeeDetailsDl(maySeeDetailsDl);
        bootstrappedData.setMaySeeSearch(!auth.isRestrictSearch() || !authConfigured || user.isPresent());
        bootstrappedData.setUsername(username);

        return bootstrappedData;
    }

}
