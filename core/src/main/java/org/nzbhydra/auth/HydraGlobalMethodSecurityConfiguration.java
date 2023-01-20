/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.auth;

import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.annotation.SecuredAnnotationSecurityMetadataSource;
import org.springframework.security.access.method.DelegatingMethodSecurityMetadataSource;
import org.springframework.security.access.method.MethodSecurityMetadataSource;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.method.configuration.GlobalMethodSecurityConfiguration;

import java.util.ArrayList;
import java.util.List;


@EnableGlobalMethodSecurity
@Configuration(proxyBeanMethods = false)
public class HydraGlobalMethodSecurityConfiguration extends GlobalMethodSecurityConfiguration {

    private static final Logger hydraLogger = LoggerFactory.getLogger(HydraGlobalMethodSecurityConfiguration.class);

    @Autowired
    private ConfigProvider configProvider;

    @Bean
    public MethodSecurityMetadataSource methodSecurityMetadataSource() {
        List<MethodSecurityMetadataSource> sources = new ArrayList<>();

        if (configProvider.getBaseConfig().getAuth().getAuthType() != AuthType.NONE || NzbHydra.isNativeBuild()) {
            hydraLogger.info("Enabling auth type " + configProvider.getBaseConfig().getAuth().getAuthType());
            sources.add(new SecuredAnnotationSecurityMetadataSource());
        }

        return new DelegatingMethodSecurityMetadataSource(sources);
    }
}
