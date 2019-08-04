package org.nzbhydra.auth;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.provisioning.UserDetailsManager;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class HydraUserDetailsManager implements UserDetailsManager {

    private static final Logger logger = LoggerFactory.getLogger(HydraUserDetailsManager.class);

    private final Map<String, UserDetails> users = new HashMap<>();

    @Autowired
    private LoginAndAccessAttemptService attemptService;
    @Autowired
    private AuthAndAccessEventHandler authAndAccessEventHandler;


    public HydraUserDetailsManager(@Autowired BaseConfig baseConfig) {
        updateUsers(baseConfig.getAuth());
    }

    private void updateUsers(AuthConfig authConfig) {
        users.clear();
        for (UserAuthConfig userAuthConfig : authConfig.getUsers()) {

            //Add a role either if it's actively assigned to him or if the right isn't restricted at all
            List<GrantedAuthority> userRoles = new ArrayList<>();
            if (userAuthConfig.isMaySeeAdmin() || !authConfig.isRestrictAdmin()) {
                userRoles.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                userRoles.add(new SimpleGrantedAuthority("ROLE_STATS"));
                userRoles.add(new SimpleGrantedAuthority("ROLE_DETAILS"));
                userRoles.add(new SimpleGrantedAuthority("ROLE_SHOW_INDEXERS"));
            } else {
                if (userAuthConfig.isMaySeeStats() || !authConfig.isRestrictStats()) {
                    userRoles.add(new SimpleGrantedAuthority("ROLE_STATS"));
                }
                if (userAuthConfig.isMaySeeDetailsDl() || !authConfig.isRestrictDetailsDl()) {
                    userRoles.add(new SimpleGrantedAuthority("ROLE_DETAILS"));
                }
                if (userAuthConfig.isShowIndexerSelection() || !authConfig.isRestrictIndexerSelection()) {
                    userRoles.add(new SimpleGrantedAuthority("ROLE_SHOW_INDEXERS"));
                }
            }
            userRoles.add(new SimpleGrantedAuthority("ROLE_USER"));
            User user = new User(userAuthConfig.getUsername(), userAuthConfig.getPassword(), userRoles);
            users.put(userAuthConfig.getUsername().toLowerCase(), user);
        }
    }

    @Override
    public void createUser(UserDetails user) {
        //NOP
    }

    @Override
    public void updateUser(UserDetails user) {
        //NOP
    }

    @Override
    public void deleteUser(String username) {
        //NOP
    }

    @Override
    public void changePassword(String oldPassword, String newPassword) {
        //NOP
    }

    @Override
    public boolean userExists(String username) {
        return users.containsKey(username.toLowerCase());
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (SessionStorage.IP.get() != null && attemptService.isBlocked(SessionStorage.IP.get())) { //In some rare cases the IP might've not yet been set
            logger.warn("Blocking access from IP {} because the maximum amount of attempts was reached", SessionStorage.IP.get());
            throw new RuntimeException("IP " + SessionStorage.IP.get() + " is currently blocked");
        }
        UserDetails user = users.get(username.toLowerCase());

        if (user == null) {
            throw new UsernameNotFoundException(username);
        }

        //Copied from super method, no idea why we do this
        return new User(user.getUsername(), user.getPassword(), user.isEnabled(),
                user.isAccountNonExpired(), user.isCredentialsNonExpired(),
                user.isAccountNonLocked(), user.getAuthorities());
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        updateUsers(event.getNewConfig().getAuth());
    }
}
