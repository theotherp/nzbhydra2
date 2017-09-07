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

import com.mongodb.client.MongoCollection;
import org.bson.Document;

/**
 * The interface <code>CollectionCallback</code> is a callback for
 * {@link MongoDBUtil#execute(String, CollectionCallback)}.
 *
 * @author Youchao
 * @version 1.0
 * @date Aug 23, 2015
 * @see MongoDBUtil#execute(String, CollectionCallback)
 * @see MongoDBUtil#connect(String, CollectionCallback)
 */
public interface CollectionCallback<T> {

    /**
     * This method is a callback method.
     *
     * @param collection The collection of MongoDB
     * @return The value which you want {@link MongoDBUtil#execute(String, CollectionCallback)}
     * returned;
     */
    T doInCollection(MongoCollection<Document> collection);

}
