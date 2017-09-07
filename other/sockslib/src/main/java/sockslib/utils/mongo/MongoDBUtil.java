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

package sockslib.utils.mongo;

import com.google.common.collect.Lists;
import com.mongodb.MongoClient;
import com.mongodb.MongoCredential;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.DeleteResult;
import org.apache.logging.log4j.util.Strings;
import org.bson.Document;

/**
 * The class <code>MongoDBUtil</code> is tool class for MongoDB.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Aug 23, 2015
 */
public class MongoDBUtil {

    private String host;
    private int port = 27017;
    private String username;
    private String password;
    private String databaseName;
    private MongoClient mongoClient;

    public MongoDBUtil() {
    }

    public MongoDBUtil(String host, int port, String databaseName) {
        this.host = host;
        this.port = port;
        this.databaseName = databaseName;
    }

    public MongoDBUtil(String host, int port, String databaseName, String username, String password) {
        this.host = host;
        this.port = port;
        this.databaseName = databaseName;
        this.username = username;
        this.password = password;
    }

    public DeleteResult deleteAll(String collectionName) {
        return execute(collectionName, collection -> collection.deleteMany(new Document()));
    }

    public void dropCollection(String collectionName) {
        execute(collectionName, collection -> {
            collection.drop();
            return null;
        });
    }

    public <T> T execute(String collectionName, CollectionCallback<T> callback) {
        MongoDatabase database = null;
        if (mongoClient == null) {
            mongoClient = getConnectedClient();
        }
        return callback.doInCollection(
                mongoClient.getDatabase(databaseName).getCollection(collectionName));
    }

    public void closeConnection() {
        if (mongoClient != null) {
            mongoClient.close();
        }
    }

    /**
     * Connect MongoDB and call callback, close connection at last.
     *
     * @param collectionName Collection name.
     * @param callback       Callback
     * @param <T>            The type of value which you want to return.
     * @return The value which callback returned.
     */
    public <T> T connect(String collectionName, CollectionCallback<T> callback) {
        MongoClient client = null;
        T t = null;
        try {
            client = getConnectedClient();
            MongoDatabase database = client.getDatabase(databaseName);
            MongoCollection<Document> collection = database.getCollection(collectionName);
            t = callback.doInCollection(collection);
        } finally {
            if (client != null) {
                client.close();
            }
        }
        return t;
    }

    public MongoCollection getCollection(String collectionName) {
        if (mongoClient == null) {
            mongoClient = getConnectedClient();
        }
        return mongoClient.getDatabase(databaseName).getCollection(collectionName);
    }

    private MongoClient getConnectedClient() {
        if (Strings.isEmpty(username)) {
            return new MongoClient(host, port);
        } else {
            MongoCredential credential =
                    MongoCredential.createCredential(username, databaseName, password.toCharArray());
            return new MongoClient(new ServerAddress(host, port), Lists.newArrayList(credential));
        }
    }
}
