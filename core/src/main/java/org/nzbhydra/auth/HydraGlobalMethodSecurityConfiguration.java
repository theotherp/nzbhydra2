package org.nzbhydra.auth;

import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.annotation.SecuredAnnotationSecurityMetadataSource;
import org.springframework.security.access.method.MethodSecurityMetadataSource;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.method.configuration.GlobalMethodSecurityConfiguration;

@EnableGlobalMethodSecurity
@Configuration
public class HydraGlobalMethodSecurityConfiguration extends GlobalMethodSecurityConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(HydraGlobalMethodSecurityConfiguration.class);

    @Autowired
    private BaseConfig baseConfig;

    @Override
    protected AuthenticationManager authenticationManager() throws Exception {
        return super.authenticationManager();
    }

    @Override
    protected MethodSecurityMetadataSource customMethodSecurityMetadataSource() {
        if (baseConfig.getAuth().getAuthType() != AuthType.NONE) {
            logger.info("Enabling auth type " + baseConfig.getAuth().getAuthType());
            return new SecuredAnnotationSecurityMetadataSource();
        }
        return null;
    }
}
