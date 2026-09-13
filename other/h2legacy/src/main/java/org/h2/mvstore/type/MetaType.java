/*
 * Copyright 2004-2022 H2 Group. Multiple-Licensed under the MPL 2.0,
 * and the EPL 1.0 (https://h2database.com/html/license.html).
 * Initial Developer: H2 Group
 */
package org.h2.mvstore.type;

import org.h2.engine.Constants;
import org.h2.mvstore.DataUtils;
import org.h2.mvstore.WriteBuffer;

import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;

/**
 * Class DBMetaType is a type for values in the type registry map.
 * <p>
 * <b>Modified copy of the H2 2.1.214 class for the {@code h2legacy} module.</b> An MVStore file stores the fully
 * qualified names of the {@link DataType} implementations of its maps, so a file written by a stock H2 2.1 contains
 * names like {@code org.h2.mvstore.db.ValueDataType$Factory}. Because this module relocates H2 to
 * {@code org.nzbhydra.h2legacy.org.h2}, the plain {@code Class.forName} of the original class would resolve those
 * names against the <i>bundled</i> H2 that lives in {@code org.h2} in the same JVM and fail with a
 * {@link ClassCastException}. This copy maps the stored names to the relocated ones when reading and back to the
 * original ones when writing, so the file stays readable by a stock H2 2.1 as well. Everything else is unchanged.
 * <p>
 * The relocation prefix is derived from this class's own name at runtime instead of being hard coded, because the
 * shade relocation rewrites string constants too. When the class is used without relocation (plain H2 on the
 * classpath) the prefix is empty and the mapping is a no-op.
 *
 * @param <D> type of opaque parameter passed as an operational context to Factory.create()
 * @author <a href='mailto:andrei.tokar@gmail.com'>Andrei Tokar</a>
 */
public final class MetaType<D> extends BasicDataType<DataType<?>> {

    /**
     * {@code "org.h2."}, assembled at runtime so that neither javac's constant folding nor the shade relocation
     * turns it into the relocated package name.
     */
    private static final String ORIGINAL_PACKAGE_PREFIX = String.join(".", "org", "h2") + ".";

    /**
     * {@code "org.nzbhydra.h2legacy."} when relocated, empty otherwise.
     */
    private static final String RELOCATION_PREFIX = determineRelocationPrefix();

    private final D database;
    private final Thread.UncaughtExceptionHandler exceptionHandler;
    private final Map<String, Object> cache = new HashMap<>();

    public MetaType(D database, Thread.UncaughtExceptionHandler exceptionHandler) {
        this.database = database;
        this.exceptionHandler = exceptionHandler;
    }

    private static String determineRelocationPrefix() {
        final String name = MetaType.class.getName();
        final int index = name.lastIndexOf(ORIGINAL_PACKAGE_PREFIX);
        return index <= 0 ? "" : name.substring(0, index);
    }

    /**
     * Maps a class name as stored in the file to the name of the relocated class.
     */
    private static String toRelocatedClassName(String className) {
        if (RELOCATION_PREFIX.isEmpty() || !className.startsWith(ORIGINAL_PACKAGE_PREFIX)) {
            return className;
        }
        return RELOCATION_PREFIX + className;
    }

    /**
     * Maps the name of a relocated class back to the name a stock H2 of this version would write.
     */
    private static String toOriginalClassName(String className) {
        if (RELOCATION_PREFIX.isEmpty() || !className.startsWith(RELOCATION_PREFIX)) {
            return className;
        }
        return className.substring(RELOCATION_PREFIX.length());
    }

    @Override
    public int compare(DataType<?> a, DataType<?> b) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int getMemory(DataType<?> obj) {
        return Constants.MEMORY_OBJECT;
    }

    @SuppressWarnings("unchecked")
    @Override
    public void write(WriteBuffer buff, DataType<?> obj) {
        Class<?> clazz = obj.getClass();
        StatefulDataType<D> statefulDataType = null;
        if (obj instanceof StatefulDataType) {
            statefulDataType = (StatefulDataType<D>) obj;
            StatefulDataType.Factory<D> factory = statefulDataType.getFactory();
            if (factory != null) {
                clazz = factory.getClass();
            }
        }
        String className = toOriginalClassName(clazz.getName());
        int len = className.length();
        buff.putVarInt(len)
            .putStringData(className, len);
        if (statefulDataType != null) {
            statefulDataType.save(buff, this);
        }
    }

    @SuppressWarnings("unchecked")
    @Override
    public DataType<?> read(ByteBuffer buff) {
        int len = DataUtils.readVarInt(buff);
        String className = DataUtils.readString(buff, len);
        try {
            Object o = cache.get(className);
            if (o != null) {
                if (o instanceof StatefulDataType.Factory) {
                    return ((StatefulDataType.Factory<D>) o).create(buff, this, database);
                }
                return (DataType<?>) o;
            }
            Class<?> clazz = Class.forName(toRelocatedClassName(className));
            boolean singleton = false;
            Object obj;
            try {
                obj = clazz.getDeclaredField("INSTANCE").get(null);
                singleton = true;
            } catch (ReflectiveOperationException | NullPointerException e) {
                obj = clazz.getDeclaredConstructor().newInstance();
            }
            if (obj instanceof StatefulDataType.Factory) {
                StatefulDataType.Factory<D> factory = (StatefulDataType.Factory<D>) obj;
                cache.put(className, factory);
                return factory.create(buff, this, database);
            }
            if (singleton) {
                cache.put(className, obj);
            }
            return (DataType<?>) obj;
        } catch (ReflectiveOperationException | SecurityException | IllegalArgumentException e) {
            if (exceptionHandler != null) {
                exceptionHandler.uncaughtException(Thread.currentThread(), e);
            }
            throw new RuntimeException(e);
        }
    }

    @Override
    public DataType<?>[] createStorage(int size) {
        return new DataType[size];
    }
}
