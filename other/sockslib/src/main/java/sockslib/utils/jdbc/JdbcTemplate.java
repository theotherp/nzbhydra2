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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.Date;
import java.sql.NClob;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import static com.google.common.base.Preconditions.checkNotNull;

/**
 * The class <code>JdbcTemplate</code> is a template for JDBC operation. This class provides some
 * easy methods to do JDBC work.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Sep 07, 2015
 */
public class JdbcTemplate {

    private static final Logger logger = LoggerFactory.getLogger(JdbcTemplate.class);

    private DataSource dataSource;

    /**
     * Constructs an instance of {@link JdbcTemplate} with specified <code>java.sql.DataSource</code>
     *
     * @param dataSource DataSource
     */
    public JdbcTemplate(DataSource dataSource) {
        this.dataSource = checkNotNull(dataSource, "Argument [dataSource] may not null");
    }

    public int deleteAll(final String tableName) {
        String sql = "delete from " + tableName;
        return execute(sql);
    }

    public int execute(final String sql) {
        return execute(sql, null);
    }

    public int execute(final String sql, final Object[] args) {
        Connection connection = null;
        PreparedStatement preparedStatement = null;
        try {
            connection = dataSource.getConnection();
            connection.setAutoCommit(false);
            preparedStatement = connection.prepareStatement(sql);
            setParameter(preparedStatement, args);
            int result = preparedStatement.executeUpdate();
            connection.commit();
            connection.rollback();
            return result;
        } catch (SQLException e) {
            logger.error(e.getMessage(), e);
        } finally {
            close(preparedStatement);
            close(connection);
        }
        return 0;
    }

    public <T> List<T> query(final String sql, RowMapper<T> rowMapper) {
        return query(sql, null, rowMapper);
    }

    public <T> List<T> query(final String sql, final Object[] args, RowMapper<T> rowMapper) {
        List<T> entities = new ArrayList<>();
        Connection connection = null;
        PreparedStatement preparedStatement = null;
        ResultSet resultSet = null;
        try {
            connection = dataSource.getConnection();
            connection.setAutoCommit(false);
            preparedStatement = connection.prepareStatement(sql);
            setParameter(preparedStatement, args);
            resultSet = preparedStatement.executeQuery();
            while (resultSet.next()) {
                entities.add(rowMapper.map(new ReadOnlyResultSet(resultSet)));
            }
            connection.commit();
        } catch (SQLException e) {
            logger.error(e.getMessage(), e);
        } finally {
            close(resultSet);
            close(preparedStatement);
            close(connection);
        }
        return entities;
    }

    private void setParameter(PreparedStatement preparedStatement, Object[] args) throws
            SQLException {
        if (args == null || args.length == 0) {
            return;
        }
        for (int i = 0; i < args.length; i++) {
            Object arg = args[i];
            if (TypeUtil.isInt(arg)) {
                preparedStatement.setInt(i + 1, (Integer) arg);
            } else if (TypeUtil.isString(arg)) {
                preparedStatement.setString(i + 1, (String) arg);
            } else if (TypeUtil.isLong(arg)) {
                preparedStatement.setLong(i + 1, (Long) arg);
            } else if (TypeUtil.isDouble(arg)) {
                preparedStatement.setDouble(i + 1, (Double) arg);
            } else if (TypeUtil.isFloat(arg)) {
                preparedStatement.setFloat(i + 1, (Float) arg);
            } else if (TypeUtil.isBoolean(arg)) {
                preparedStatement.setBoolean(i + 1, (Boolean) arg);
            } else if (TypeUtil.isByte(arg)) {
                preparedStatement.setByte(i + 1, (Byte) arg);
            } else if (TypeUtil.isDate(arg)) {
                preparedStatement.setDate(i + 1, (Date) arg);
            } else if (TypeUtil.isShort(arg)) {
                preparedStatement.setShort(i + 1, (Short) arg);
            } else if (TypeUtil.isArray(arg)) {
                preparedStatement.setArray(i + 1, (Array) arg);
            } else if (TypeUtil.isInputStream(arg)) {
                preparedStatement.setAsciiStream(i + 1, (InputStream) arg);
            } else if (TypeUtil.isBigDecimal(arg)) {
                preparedStatement.setBigDecimal(i + 1, (BigDecimal) arg);
            } else if (TypeUtil.isBlob(arg)) {
                preparedStatement.setBlob(i + 1, (Blob) arg);
            } else if (TypeUtil.isBytes(arg)) {
                preparedStatement.setBytes(i + 1, (byte[]) arg);
            } else if (TypeUtil.isClob(arg)) {
                preparedStatement.setClob(i + 1, (Clob) arg);
            } else if (TypeUtil.isNClob(arg)) {
                preparedStatement.setNClob(i + 1, (NClob) arg);
            } else {
                throw new IllegalArgumentException(
                        "Type:" + arg.getClass().getName() + " is not supported");
            }
        }
    }

    private void close(ResultSet resultSet) {
        try {
            if (resultSet != null) {
                resultSet.close();
            }
        } catch (SQLException e) {
            logger.error(e.getMessage(), e);
        }
    }

    private void close(PreparedStatement preparedStatement) {
        try {
            if (preparedStatement != null) {
                preparedStatement.close();
            }
        } catch (SQLException e) {
            logger.error(e.getMessage(), e);
        }
    }

    private void close(Connection connection) {
        try {
            if (connection != null) {
                connection.close();
            }
        } catch (SQLException e) {
            logger.error(e.getMessage(), e);
        }
    }

    public DataSource getDataSource() {
        return dataSource;
    }

    public void setDataSource(DataSource dataSource) {
        this.dataSource = dataSource;
    }
}
