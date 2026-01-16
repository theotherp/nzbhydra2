

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
