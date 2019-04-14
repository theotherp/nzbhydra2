/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading.downloaders;

import java.text.DecimalFormat;

public class Converters {

    private static final long K = 1024;
    private static final long M = K * K;
    private static final long G = M * K;
    private static final long T = G * K;

    public static String formatTime(long secs) {
        long days = (secs / (24 * 60 * 60));
        long hours = (secs % 86400) / 3600;
        long minutes = (secs % 3600) / 60;
        long seconds = secs % 60;
        if (days == 0) {
            if (hours == 0) {
                return String.format("%02dm %02ds", minutes, seconds);
            }
            return String.format("%02dh %02dm", hours, minutes);
        }
        return String.format("%01dd %02dh", days, hours);
    }

    public static String formatMegabytes(long value, boolean precise) {
        return formatBytes(value * 1024L * 1024L, precise);
    }

    public static String formatBytesPerSecond(long value, boolean precise) {
        if (value == 0) {
            return "";
        }
        return formatBytes(value, precise) + "/s";
    }

    public static String formatBytes(long value, boolean precise) {
        final long[] dividers = new long[]{T, G, M, K, 1};
        final String[] units = new String[]{"TB", "GB", "MB", "KB", "B"};
        if (value < 1) {
            return "";
        }
        String result = null;
        for (int i = 0; i < dividers.length; i++) {
            final long divider = dividers[i];
            if (value >= divider) {
                result = format(value, divider, units[i], precise);
                break;
            }
        }
        return result;
    }

    private static String format(final long value,
                                 final long divider,
                                 final String unit, final boolean precise) {
        final double result =
                divider > 1 ? (double) value / (double) divider : (double) value;
        return new DecimalFormat(precise ? "#,##0.#" : "#,##0").format(result) + " " + unit;
    }
}
