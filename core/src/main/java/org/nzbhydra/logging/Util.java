package org.nzbhydra.logging;

/*
 * DSI utilities
 *
 * Copyright (C) 2002-2017 Sebastiano Vigna
 *
 *  This library is free software; you can redistribute it and/or modify it
 *  under the terms of the GNU Lesser General Public License as published by the Free
 *  Software Foundation; either version 3 of the License, or (at your option)
 *  any later version.
 *
 *  This library is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 *  or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License
 *  for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses/>.
 *
 */


import java.text.DecimalFormat;
import java.text.FieldPosition;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * All-purpose static-method container class.
 *
 * @author Sebastiano Vigna
 * @since 0.1
 */

public final class Util {
    private Util() {
    }

    /**
     * A reasonable format for real numbers. Shared by all format methods.
     */
    private static final NumberFormat FORMAT_DOUBLE = NumberFormat.getInstance(Locale.US);

    static {
        if (FORMAT_DOUBLE instanceof DecimalFormat) {
            ((DecimalFormat) FORMAT_DOUBLE).applyPattern("#,##0.00");
        }
    }

    /**
     * A reasonable format for integers. Shared by all format methods.
     */
    private static final NumberFormat FORMAT_LONG = NumberFormat.getInstance(Locale.US);

    static {
        if (FORMAT_DOUBLE instanceof DecimalFormat) {
            ((DecimalFormat) FORMAT_LONG).applyPattern("#,###");
        }
    }

    private static final FieldPosition UNUSED_FIELD_POSITION = new java.text.FieldPosition(0);

    /**
     * Formats a number.
     * <p>
     * <P>This method formats a double separating thousands and printing just two fractional digits.
     * <p>Note that the method is synchronized, as it uses a static {@link NumberFormat}.
     *
     * @param d a number.
     * @return a string containing a pretty print of the number.
     */
    public synchronized static String format(final double d) {
        return FORMAT_DOUBLE.format(d, new StringBuffer(), UNUSED_FIELD_POSITION).toString();
    }

    /**
     * Formats a number.
     * <p>
     * <P>This method formats a long separating thousands.
     * <p>Note that the method is synchronized, as it uses a static {@link NumberFormat}.
     *
     * @param l a number.
     * @return a string containing a pretty print of the number.
     */
    public synchronized static String format(final long l) {
        return FORMAT_LONG.format(l, new StringBuffer(), UNUSED_FIELD_POSITION).toString();
    }

    /**
     * Formats a number using a specified {@link NumberFormat}.
     *
     * @param d      a number.
     * @param format a format.
     * @return a string containing a pretty print of the number.
     */
    public static String format(final double d, final NumberFormat format) {
        final StringBuffer s = new StringBuffer();
        return format.format(d, s, UNUSED_FIELD_POSITION).toString();
    }


    /**
     * Formats a number using a specified {@link NumberFormat}.
     *
     * @param l      a number.
     * @param format a format.
     * @return a string containing a pretty print of the number.
     */
    public static String format(final long l, final NumberFormat format) {
        final StringBuffer s = new StringBuffer();
        return format.format(l, s, UNUSED_FIELD_POSITION).toString();
    }

    /**
     * Formats a size.
     * <p>
     * <P>This method formats a long using suitable unit multipliers (e.g., <code>K</code>, <code>M</code>, <code>G</code>, and <code>T</code>)
     * and printing just two fractional digits.
     * <p>Note that the method is synchronized, as it uses a static {@link NumberFormat}.
     *
     * @param l a number, representing a size (e.g., memory).
     * @return a string containing a pretty print of the number using unit multipliers.
     */
    public static String formatSize(final long l) {
        if (l >= 1000000000000L) {
            return format(l / 1000000000000.0) + "T";
        }
        if (l >= 1000000000L) {
            return format(l / 1000000000.0) + "G";
        }
        if (l >= 1000000L) {
            return format(l / 1000000.0) + "M";
        }
        if (l >= 1000L) {
            return format(l / 1000.0) + "K";
        }
        return Long.toString(l);
    }

    /**
     * Formats a binary size.
     * <p>
     * <P>This method formats a long using suitable unit binary multipliers (e.g., <code>Ki</code>, <code>Mi</code>, <code>Gi</code>, and <code>Ti</code>)
     * and printing <em>no</em> fractional digits. The argument must be a power of 2.
     * <p>Note that the method is synchronized, as it uses a static {@link NumberFormat}.
     *
     * @param l a number, representing a binary size (e.g., memory); must be a power of 2.
     * @return a string containing a pretty print of the number using binary unit multipliers.
     */
    public static String formatBinarySize(final long l) {
        if ((l & -l) != l) {
            throw new IllegalArgumentException("Not a power of 2: " + l);
        }
        if (l >= (1L << 40)) {
            return format(l >> 40) + "Ti";
        }
        if (l >= (1L << 30)) {
            return format(l >> 30) + "Gi";
        }
        if (l >= (1L << 20)) {
            return format(l >> 20) + "Mi";
        }
        if (l >= (1L << 10)) {
            return format(l >> 10) + "Ki";
        }
        return Long.toString(l);
    }

    /**
     * Formats a size.
     * <p>
     * <P>This method formats a long using suitable binary
     * unit multipliers (e.g., <code>Ki</code>, <code>Mi</code>, <code>Gi</code>, and <code>Ti</code>)
     * and printing just two fractional digits.
     * <p>Note that the method is synchronized, as it uses a static {@link NumberFormat}.
     *
     * @param l a number, representing a size (e.g., memory).
     * @return a string containing a pretty print of the number using binary unit multipliers.
     */
    public static String formatSize2(final long l) {
        if (l >= 1L << 40) {
            return format((double) l / (1L << 40)) + "Ti";
        }
        if (l >= 1L << 30) {
            return format((double) l / (1L << 30)) + "Gi";
        }
        if (l >= 1L << 20) {
            return format((double) l / (1L << 20)) + "Mi";
        }
        if (l >= 1L << 10) {
            return format((double) l / (1L << 10)) + "Ki";
        }
        return Long.toString(l);
    }

    /**
     * Formats a size using a specified {@link NumberFormat}.
     * <p>
     * <P>This method formats a long using suitable unit multipliers (e.g., <code>K</code>, <code>M</code>, <code>G</code>, and <code>T</code>)
     * and the given {@link NumberFormat} for the digits.
     *
     * @param l      a number, representing a size (e.g., memory).
     * @param format a format.
     * @return a string containing a pretty print of the number using unit multipliers.
     */
    public static String formatSize(final long l, final NumberFormat format) {
        if (l >= 1000000000000L) {
            return format(l / 1000000000000.0) + "T";
        }
        if (l >= 1000000000L) {
            return format(l / 1000000000.0) + "G";
        }
        if (l >= 1000000L) {
            return format(l / 1000000.0) + "M";
        }
        if (l >= 1000L) {
            return format(l / 1000.0) + "K";
        }
        return Long.toString(l);
    }

    /**
     * Formats a size using a specified {@link NumberFormat}.
     * <p>
     * <P>This method formats a long using suitable unit binary multipliers (e.g., <code>Ki</code>, <code>Mi</code>, <code>Gi</code>, and <code>Ti</code>)
     * and the given {@link NumberFormat} for the digits. The argument must be a power of 2.
     *
     * @param l      a number, representing a binary size (e.g., memory); must be a power of 2.
     * @param format a format.
     * @return a string containing a pretty print of the number using binary unit multipliers.
     */
    public static String formatBinarySize(final long l, final NumberFormat format) {
        if ((l & -l) != l) {
            throw new IllegalArgumentException("Not a power of 2: " + l);
        }
        if (l >= (1L << 40)) {
            return format(l >> 40) + "Ti";
        }
        if (l >= (1L << 30)) {
            return format(l >> 30) + "Gi";
        }
        if (l >= (1L << 20)) {
            return format(l >> 20) + "Mi";
        }
        if (l >= (1L << 10)) {
            return format(l >> 10) + "Ki";
        }
        return Long.toString(l);
    }

    /**
     * Formats a size using a specified {@link NumberFormat} and binary unit multipliers.
     * <p>
     * <P>This method formats a long using suitable binary
     * unit multipliers (e.g., <code>Ki</code>, <code>Mi</code>, <code>Gi</code>, and <code>Ti</code>)
     * and the given {@link NumberFormat} for the digits.
     *
     * @param l      a number, representing a size (e.g., memory).
     * @param format a format.
     * @return a string containing a pretty print of the number using binary unit multipliers.
     */
    public static String formatSize2(final long l, final NumberFormat format) {
        if (l >= 1L << 40) {
            return format((double) l / (1L << 40)) + "Ti";
        }
        if (l >= 1L << 30) {
            return format((double) l / (1L << 30)) + "Gi";
        }
        if (l >= 1L << 20) {
            return format((double) l / (1L << 20)) + "Mi";
        }
        if (l >= 1L << 10) {
            return format((double) l / (1L << 10)) + "Ki";
        }
        return Long.toString(l);
    }

    /**
     * A static reference to {@link Runtime#getRuntime()}.
     */
    public final static Runtime RUNTIME = Runtime.getRuntime();

    /**
     * Returns true if less then 5% of the available memory is free.
     *
     * @return true if less then 5% of the available memory is free.
     */
    public static boolean memoryIsLow() {
        return availableMemory() * 100 < RUNTIME.totalMemory() * 5;
    }

    /**
     * Returns the amount of available memory (free memory plus never allocated memory).
     *
     * @return the amount of available memory, in bytes.
     */
    public static long availableMemory() {
        return RUNTIME.freeMemory() + (RUNTIME.maxMemory() - RUNTIME.totalMemory());
    }

    /**
     * Returns the percentage of available memory (free memory plus never allocated memory).
     *
     * @return the percentage of available memory.
     */
    public static int percAvailableMemory() {
        return (int) ((Util.availableMemory() * 100) / Runtime.getRuntime().maxMemory());
    }

    /**
     * Tries to compact memory as much as possible by forcing garbage collection.
     */
    public static void compactMemory() {
        try {
            final byte[][] unused = new byte[128][];
            for (int i = unused.length; i-- != 0; ) {
                unused[i] = new byte[2000000000];
            }
        } catch (OutOfMemoryError itsWhatWeWanted) {
        }
        System.gc();
    }


}
