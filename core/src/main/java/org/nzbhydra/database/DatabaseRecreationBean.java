

package org.nzbhydra.database;


import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.Ordered;

public class DatabaseRecreationBean implements InitializingBean, Ordered {
    @Override
    public void afterPropertiesSet() throws Exception {
        DatabaseRecreation.runDatabaseScript();
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
