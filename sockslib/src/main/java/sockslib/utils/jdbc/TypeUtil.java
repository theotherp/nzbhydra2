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

import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.NClob;
import java.util.Date;

/**
 * The class <code>TypeUtil</code> is tool to judge class type of an object.
 *
 * @author Youchao Feng
 * @version 1.0
 * @date Sep 07, 2015
 */
public class TypeUtil {

    public static boolean isInt(Object object) {
        return object instanceof Integer;
    }

    public static boolean isLong(Object object) {
        return object instanceof Long;
    }

    public static boolean isFloat(Object object) {
        return object instanceof Float;
    }

    public static boolean isDouble(Object object) {
        return object instanceof Double;
    }

    public static boolean isByte(Object object) {
        return object instanceof Byte;
    }

    public static boolean isShort(Object object) {
        return object instanceof Short;
    }

    public static boolean isChar(Object object) {
        return object instanceof Character;
    }

    public static boolean isBoolean(Object object) {
        return object instanceof Boolean;
    }

    public static boolean isString(Object object) {
        return object instanceof String;
    }

    public static boolean isDate(Object object) {
        return object instanceof Date;
    }

    public static boolean isArray(Object object) {
        return object instanceof Array;
    }

    public static boolean isInputStream(Object object) {
        return object instanceof InputStream;
    }

    public static boolean isBigDecimal(Object object) {
        return object instanceof BigDecimal;
    }

    public static boolean isBlob(Object object) {
        return object instanceof Blob;
    }

    public static boolean isBytes(Object object) {
        return object instanceof byte[];
    }

    public static boolean isClob(Object object) {
        return object instanceof Clob;
    }

    public static boolean isNClob(Object object) {
        return object instanceof NClob;
    }
}
