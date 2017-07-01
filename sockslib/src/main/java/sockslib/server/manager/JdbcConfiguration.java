/*
 * Copyright 2015-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package sockslib.server.manager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import sockslib.utils.PathUtil;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

/**
 * The class <code>JdbcConfiguration</code> is a tool class to config JDBC.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Sep 07, 2015
 */
public class JdbcConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(JdbcConfiguration.class);
    private static final String URL_KEY = "jdbc.url";
    private static final String USERNAME_KEY = "jdbc.username";
    private static final String PASSWORD_KEY = "jdbc.password";

    private String url;
    private String username;
    private String password;

    public JdbcConfiguration(String url, String username, String password) {
        this.url = url;
        this.username = username;
        this.password = password;
    }

    public static JdbcConfiguration load(String filePath) {
        try {
            String realPath = PathUtil.getAbstractPath(filePath);
            logger.debug("Load file:{}", realPath);
            Properties properties = new Properties();
            properties.load(new FileInputStream(realPath));
            String url = properties.getProperty(URL_KEY);
            String username = properties.getProperty(USERNAME_KEY);
            String password = properties.getProperty(PASSWORD_KEY);
            return new JdbcConfiguration(url, username, password);
        } catch (IOException e) {
            logger.error(e.getMessage(), e);
        }
        return null;
    }

    public String getUrl() {
        return url;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }
}
