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

import sockslib.utils.jdbc.ReadOnlyResultSet;
import sockslib.utils.jdbc.RowMapper;

import java.sql.SQLException;

/**
 * The class <code>UserRowMapper</code> is a mapper for {@link User}.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Sep 07, 2015
 */
public class UserRowMapper implements RowMapper<User> {

    private static final String USERNAME_COL = "username";
    private static final String PASSWORD_COL = "password";

    @Override
    public User map(ReadOnlyResultSet resultSet) throws SQLException {
        return new User(resultSet.getString(USERNAME_COL), resultSet.getString(PASSWORD_COL));
    }
}
