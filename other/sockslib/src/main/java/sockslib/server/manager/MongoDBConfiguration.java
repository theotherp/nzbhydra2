/*
 * Copyright 2015-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

package sockslib.server.manager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import sockslib.utils.PathUtil;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

/**
 * The class <code>MongoDBConfiguration</code> represents the configuration of MongoDB.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Sep 1, 2015
 */
public class MongoDBConfiguration {

    /**
     * Logger
     */
    private static final Logger logger = LoggerFactory.getLogger(MongoDBConfiguration.class);

    private static final String DEFAULT_HOST = "localhost";
    private static final int DEFAULT_PORT = 27017;
    private static final String DEFAULT_DATABASE = "fucksocks";
    private static final String HOST_KEY = "mongo.host";
    private static final String PORT_KEY = "mongo.port";
    private static final String USERNAME_KEY = "mongo.username";
    private static final String PASSWORD_KEY = "mongo.password";
    private static final String DATABASE_KEY = "mongo.db";

    /**
     * Host of MongoDB
     */
    private String host;

    /**
     * Port of MongoDB
     */
    private int port;

    /**
     * Username
     */
    private String username;

    /**
     * Password
     */
    private String password;

    /**
     * Database
     */
    private String database;

    public MongoDBConfiguration(String host, int port, String database, String username, String
            password) {
        this.host = host;
        this.port = port;
        this.database = database;
        this.username = username;
        this.password = password;
    }

    public static MongoDBConfiguration load(String filePath) {
        try {
            String realPath = PathUtil.getAbstractPath(filePath);
            logger.debug("Load file:{}", realPath);
            Properties properties = new Properties();
            properties.load(new FileInputStream(realPath));
            String host = properties.getProperty(HOST_KEY, DEFAULT_HOST);
            int port = Integer.parseInt(properties.getProperty(PORT_KEY, DEFAULT_PORT + ""));
            String database = properties.getProperty(DATABASE_KEY, DEFAULT_DATABASE);
            String username = properties.getProperty(USERNAME_KEY);
            String password = properties.getProperty(PASSWORD_KEY);
            return new MongoDBConfiguration(host, port, database, username, password);
        } catch (IOException e) {
            logger.error(e.getMessage(), e);
        }
        return null;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public int getPort() {
        return port;
    }

    public String getHost() {
        return host;
    }

    public String getDatabase() {
        return database;
    }

    @Override
    public String toString() {
        return "MongoDBConfiguration{" +
                "host='" + host + '\'' +
                ", port=" + port +
                ", username='" + username + '\'' +
                ", password='" + password + '\'' +
                ", database='" + database + '\'' +
                '}';
    }
}
