/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.database;

import com.google.common.collect.Sets;
import org.springframework.boot.sql.init.dependency.AbstractBeansOfTypeDatabaseInitializerDetector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

@Configuration(proxyBeanMethods = false)
public class DatabaseRecreationConfig extends AbstractBeansOfTypeDatabaseInitializerDetector {

    @Bean
    public DatabaseRecreationBean getDatabaseRecreationBean() {
        return new DatabaseRecreationBean();
    }

    @Override
    protected Set<Class<?>> getDatabaseInitializerBeanTypes() {
        return Sets.newHashSet(DatabaseRecreationBean.class);
    }

    @Override
    public int getOrder() {
        return -1000;
    }
}
