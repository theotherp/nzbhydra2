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

import com.google.common.base.Strings;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.mongodb.client.FindIterable;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import sockslib.utils.mongo.MongoDBUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * The class <code>MongoDBBasedUserManager</code> can manage user in MongoDB.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Aug 23, 2015
 */
public class MongoDBBasedUserManager implements UserManager {

    private static final Logger logger = LoggerFactory.getLogger(MongoDBBasedUserManager.class);
    private static final String COLLECTION_NAME = "users";
    private static final String USER_USERNAME_KEY = "un";
    private static final String USER_PASSWORD_KEY = "pw";
    private static final String MONGO_CONFIG_FILE = "classpath:mongo.properties";

    private String usernameKey = USER_USERNAME_KEY;
    private String passwordKey = USER_PASSWORD_KEY;
    private String userCollectionName = COLLECTION_NAME;
    /**
     * Cache of users
     */
    private LoadingCache<String, User> cache;
    /**
     * MongoDB util
     */
    private MongoDBUtil mongoDBUtil;
    /**
     * Password protector
     */
    private PasswordProtector passwordProtector;

    /**
     * Constructs a {@link MongoDBBasedUserManager} instance with no parameters.
     */
    public MongoDBBasedUserManager() {
    }

    /**
     * Constructs a {@link MongoDBBasedUserManager} instance with configuration file path.
     * This constructor will read a specified file.
     *
     * @param configFile Configuration file path. The path support prefix "classpath:" or "file:".
     */
    public MongoDBBasedUserManager(String configFile) {
        this(MongoDBConfiguration.load(configFile));
    }

    /**
     * Constructs a {@link MongoDBBasedUserManager} instance.
     *
     * @param host         Host of MongoDB.
     * @param port         Port of MongoDB.
     * @param databaseName Database name.
     */
    public MongoDBBasedUserManager(String host, int port, String databaseName) {
        this(host, port, databaseName, null, null);
    }

    /**
     * Constructs a {@link MongoDBBasedUserManager} instance with {@link MongoDBConfiguration}.
     *
     * @param configuration Instance of {@link MongoDBConfiguration}.
     */
    public MongoDBBasedUserManager(MongoDBConfiguration configuration) {
        this(configuration.getHost(), configuration.getPort(), configuration.getDatabase(),
                configuration.getUsername(), configuration.getPassword());
    }

    /**
     * Constructs a {@link MongoDBConfiguration}  instance with some parameters.
     *
     * @param host         Host of MongoDB.
     * @param port         Port of MongoDB.
     * @param databaseName Database name.
     * @param username     Username.
     * @param password     Password.
     */
    public MongoDBBasedUserManager(String host, int port, String databaseName, String username,
                                   String password) {
        this(new MongoDBUtil(host, port, databaseName, username, password));
    }

    public MongoDBBasedUserManager(MongoDBUtil mongoDBUtil) {
        cache =
                CacheBuilder.newBuilder().maximumSize(1000).expireAfterAccess(5, TimeUnit.MINUTES).build(
                        new CacheLoader<String, User>() {
                            @Override
                            public User load(String key) throws Exception {
                                User user;
                                user = fetchUserFromMongoDB(key);
                                if (user == null) {
                                    return new User();
                                } else {
                                    return user;
                                }
                            }

                        });
        this.mongoDBUtil = mongoDBUtil;
        passwordProtector = new NonePasswordProtector();
    }

    /**
     * Creates a {@link MongoDBBasedUserManager} instance with no parameters.
     * This method is same as <code>new MongoDBBasedUserManager("classpath:mongo.properties")</code>.
     * It will read a configuration file in class path named "mongo.properties".
     *
     * @return Instance of <code>MongoDBBasedUserManager</code>
     */
    public static MongoDBBasedUserManager newDefaultUserManager() {
        return new MongoDBBasedUserManager(MONGO_CONFIG_FILE);
    }

    public User fetchUserFromMongoDB(final String username) {
        return mongoDBUtil.execute(userCollectionName, collection -> {
            Document document = collection.find(new Document(usernameKey, username)).first();
            if (document != null) {
                return formUser(document);
            }
            return null;
        });
    }

    @Override
    public void create(final User user) {
        user.setPassword(generateEncryptPassword(user));
        mongoDBUtil.execute(userCollectionName, collection -> {
            collection.insertOne(new Document().append(usernameKey, user.getUsername())
                    .append(passwordKey, user.getPassword()));
            return null;
        });
    }

    @Override
    public UserManager addUser(final String username, final String password) {
        final User user = new User(username, password);
        user.setPassword(generateEncryptPassword(user));
        mongoDBUtil.execute(userCollectionName, collection -> {
            collection.insertOne(new Document().append(usernameKey, user.getUsername())
                    .append(passwordKey, user.getPassword()));
            return null;
        });
        return this;
    }

    @Override
    public User check(String username, String password) {
        if (username == null || password == null) {
            return null;
        }
        User user = cache.getUnchecked(username);
        if (user == null || user.getUsername() == null || user.getPassword() == null) {
            return null;
        }
        String encryptPassword = generateEncryptPassword(user, password);
        if (user.getPassword().equals(encryptPassword)) {
            return user;
        }
        return null;
    }

    @Override
    public void delete(final String username) {
        mongoDBUtil.execute(userCollectionName, collection -> {
            collection.deleteOne(new Document(usernameKey, username));
            return null;
        });
        cache.put(username, new User());
    }

    @Override
    public List<User> findAll() {
        return mongoDBUtil.execute(userCollectionName, collection -> {
            FindIterable<Document> result = collection.find();
            List<User> users = new ArrayList<>();
            for (Document document : result) {
                users.add(formUser(document));
            }
            return users;
        });
    }

    @Override
    public void update(final User user) {
        if (user == null) {
            throw new IllegalArgumentException("User can't null");
        }
        if (Strings.isNullOrEmpty(user.getUsername())) {
            throw new IllegalArgumentException("Username of the user can't be null or empty");
        }
        User old = find(user.getUsername());
        String newEncryptPassword = generateEncryptPassword(user);
        if (!old.getPassword().equals(newEncryptPassword)) {
            user.setPassword(newEncryptPassword);
        }
        mongoDBUtil.execute(userCollectionName, collection -> {
            collection.updateOne(new Document(usernameKey, user.getUsername()),
                    new Document("$set", new Document(usernameKey, user.getPassword())));
            return null;
        });
        cache.put(user.getUsername(), user);
    }

    @Override
    public User find(String username) {
        User user = cache.getUnchecked(username);
        if (user.getUsername() == null) {
            return null;
        }
        return user;
    }

    private User formUser(Document document) {
        User user = new User();
        user.setUsername(document.getString(usernameKey));
        user.setPassword(document.getString(passwordKey));
        return user;
    }


    public LoadingCache<String, User> getCache() {
        return cache;
    }

    public void setCache(LoadingCache<String, User> cache) {
        this.cache = cache;
    }

    public MongoDBUtil getMongoDBUtil() {
        return mongoDBUtil;
    }

    public void setMongoDBUtil(MongoDBUtil mongoDBUtil) {
        this.mongoDBUtil = mongoDBUtil;
    }

    public PasswordProtector getPasswordProtector() {
        return passwordProtector;
    }

    public void setPasswordProtector(PasswordProtector passwordProtector) {
        this.passwordProtector = passwordProtector;
    }

    private String generateEncryptPassword(final User user, String newPassword) {
        User tempUser = user.copy();
        if (newPassword != null) {
            tempUser.setPassword(newPassword);
        }
        if (passwordProtector == null) {
            passwordProtector = new NonePasswordProtector();
        }
        return passwordProtector.encrypt(tempUser);
    }

    private String generateEncryptPassword(final User user) {
        return generateEncryptPassword(user, null);
    }

    public String getUserCollectionName() {
        return userCollectionName;
    }

    public void setUserCollectionName(String userCollectionName) {
        this.userCollectionName = userCollectionName;
    }

    public String getUsernameKey() {
        return usernameKey;
    }

    public void setUsernameKey(String usernameKey) {
        this.usernameKey = usernameKey;
    }

    public String getPasswordKey() {
        return passwordKey;
    }

    public void setPasswordKey(String passwordKey) {
        this.passwordKey = passwordKey;
    }
}
