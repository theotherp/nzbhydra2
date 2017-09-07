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

import com.google.common.base.Strings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import sockslib.common.NotImplementException;
import sockslib.utils.jdbc.JdbcTemplate;
import sockslib.utils.jdbc.RowMapper;

import javax.sql.DataSource;
import java.util.List;

import static com.google.common.base.Preconditions.checkNotNull;

/**
 * The class <code>JdbcBasedUserManager</code> is JDBC based user manager.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Aug 28,2015
 */
public class JdbcBasedUserManager implements UserManager {

    public static final String USER_TABLE_NAME = "SOCKS_USERS";
    private static final Logger logger = LoggerFactory.getLogger(JdbcConfiguration.class);
    private static final String CREATE_USER_SQL =
            "INSERT INTO " + USER_TABLE_NAME + " (`username`,`password`)VALUES(?,?)";
    private static final String QUERY_BY_USERNAME =
            "SELECT * FROM " + USER_TABLE_NAME + " WHERE `username` = ?";
    private static final String QUERY_ALL_SQL = "SELECT * FROM " + USER_TABLE_NAME;
    private static final String UPDATE_USER_SQL =
            "UPDATE " + USER_TABLE_NAME + " SET `password` = ? WHERE `username`=?";
    private static final String DELETE_USER_SQL =
            "delete from " + USER_TABLE_NAME + " where `username`=?";

    private String createUserSql = CREATE_USER_SQL;
    private String updateUserSql = UPDATE_USER_SQL;
    private String queryAllUserSql = QUERY_ALL_SQL;
    private String queryByUsernameSql = QUERY_BY_USERNAME;
    private String deleteUserSql = DELETE_USER_SQL;

    private JdbcTemplate jdbcTemplate;
    private DataSource dataSource;
    private RowMapper<User> rowMapper = new UserRowMapper();
    private PasswordProtector passwordProtector = new NonePasswordProtector();

    public JdbcBasedUserManager() {
    }

    public JdbcBasedUserManager(DataSource dataSource) {
        this.dataSource = checkNotNull(dataSource, "Argument [dataSource] may not be null");
        jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public void create(User user) {
        user.setPassword(generateEncryptPassword(user));
        Object[] args = {user.getUsername(), user.getPassword()};
        jdbcTemplate.execute(createUserSql, args);
    }

    @Override
    public UserManager addUser(String username, String password) {
        create(new User(username, password));
        return this;
    }

    @Override
    public User check(String username, String password) {
        User user = find(username);
        if (user != null) {
            String encryptPassword = generateEncryptPassword(user, password);
            if (user.getPassword().equals(encryptPassword)) {
                return user;
            } else {
                return null;
            }
        }
        return null;
    }

    @Override
    public void delete(String username) {
        throw new NotImplementException();
    }

    @Override
    public List<User> findAll() {
        return jdbcTemplate.query(queryAllUserSql, rowMapper);
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
        Object[] args = {user.getPassword(), user.getUsername()};
        jdbcTemplate.execute(updateUserSql, args);
    }

    @Override
    public User find(final String username) {
        Object[] args = {username};
        List<User> users = jdbcTemplate.query(queryByUsernameSql, args, rowMapper);
        if (users.size() >= 1) {
            return users.get(0);
        }
        return null;
    }

    public DataSource getDataSource() {
        return dataSource;
    }

    public void setDataSource(DataSource dataSource) {
        this.dataSource = dataSource;
        jdbcTemplate = new JdbcTemplate(dataSource);
    }

    public JdbcTemplate getJdbcTemplate() {
        return jdbcTemplate;
    }

    public void setJdbcTemplate(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public RowMapper<User> getRowMapper() {
        return rowMapper;
    }

    public void setRowMapper(RowMapper<User> rowMapper) {
        this.rowMapper = rowMapper;
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

    public PasswordProtector getPasswordProtector() {
        return passwordProtector;
    }

    public void setPasswordProtector(PasswordProtector passwordProtector) {
        this.passwordProtector = passwordProtector;
    }

    public String getQueryByUsernameSql() {
        return queryByUsernameSql;
    }

    public void setQueryByUsernameSql(String queryByUsernameSql) {
        this.queryByUsernameSql = queryByUsernameSql;
    }

    public String getQueryAllUserSql() {
        return queryAllUserSql;
    }

    public void setQueryAllUserSql(String queryAllUserSql) {
        this.queryAllUserSql = queryAllUserSql;
    }

    public String getUpdateUserSql() {
        return updateUserSql;
    }

    public void setUpdateUserSql(String updateUserSql) {
        this.updateUserSql = updateUserSql;
    }

    public String getCreateUserSql() {
        return createUserSql;
    }

    public void setCreateUserSql(String createUserSql) {
        this.createUserSql = createUserSql;
    }

    public String getDeleteUserSql() {
        return deleteUserSql;
    }

    public void setDeleteUserSql(String deleteUserSql) {
        this.deleteUserSql = deleteUserSql;
    }
}
