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

package sockslib.utils.jdbc;

import java.sql.SQLException;

/**
 * The interface <code>RowMapper</code> is a ORM mapper.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Sep 07, 2015
 */
public interface RowMapper<T> {

    /**
     * This method can read a {@link ReadOnlyResultSet} to create an object.
     *
     * @param resultSet Instance of {@link ReadOnlyResultSet}
     * @return Entity
     * @throws SQLException If any SQL error occurred.
     */
    T map(ReadOnlyResultSet resultSet) throws SQLException;

}
