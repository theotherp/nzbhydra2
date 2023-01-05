package org.nzbhydra.logging;

/*
 * DSI utilities
 *
 * Copyright (C) 2005-2017 Sebastiano Vigna
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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.nzbhydra.logging.Util.RUNTIME;

/**
 * Tunable progress logger.
 * <p>
 * <P>This class provides a simple way to log progress information about long-lasting activities. While originally
 * based on <a href="http://logging.apache.org/log4j/1.2/">Log4J 1.2</a>, it is currently based on <a href="http://www.slf4j.org/">SLF4J</a>.
 * <p>
 * <P>To use this class, you first create a new instance by passing an
 * {@linkplain #ProgressLogger(Logger, long, TimeUnit, String) SLF4J logger, a time interval and a name for the items that are being logged}.
 * Information will be logged about the current state of affairs no more often than the given
 * time interval. Note that the {@linkplain #itemsName name of the logged items} can be changed at any time.
 * <p>
 * <P>To log the progress of an activity, you call {@link #start(CharSequence)} at the beginning, which will
 * display the given string. Then, each time you want to mark progress, you call usually {@link #update()} or {@link #lightUpdate()}.
 * The latter methods increase the item counter, and will log progress information if enough time
 * has passed since the last log (and if the counter is a multiple of {@link #LIGHT_UPDATE_MASK} + 1, in the case of {@link #lightUpdate()}).
 * Other update methods (e.g., {@link #update(long)}, {@link #updateAndDisplay()}, &hellip;) make the update and display process very flexible.
 * <p>
 * When the activity is over, you call {@link #stop()}. At that point, the method {@link #toString()} returns
 * information about the internal state of the logger (elapsed time, number of items per second) that
 * can be printed or otherwise processed. If {@link #update()} has never been called, you will just
 * get the elapsed time. By calling {@link #done()} instead of stop, this information will be logged for you.
 * <p>
 * <P>Additionally:
 * <UL>
 * <LI>by setting the {@linkplain #expectedUpdates expected amount of updates} before
 * calling {@link #start()} you can get some estimations on the completion time;
 * <LI>by setting {@link #displayFreeMemory} you can display information about the
 * memory usage;
 * <LI>by setting {@link #displayLocalSpeed} you can display, beside the average speed since
 * the start of the activity, the speed since the last log;
 * <LI>by setting {@link #info} you can display arbitrary additional information.
 * <LI>by setting {@link #speedTimeUnit} and {@link #itemTimeUnit} you can fix the time unit
 * used to measure the speed and the time per item.
 * </UL>
 * <p>
 * <P>After you finished a run of the progress logger,
 * you can change its attributes and call {@link #start()} again
 * to measure another activity.
 * <p>
 * <P>A typical call sequence to a progress logger is as follows:
 * <PRE>
 * ProgressLogger pl = new ProgressLogger( logger, 1, TimeUnit.MINUTES );
 * pl.start( "Smashing pumpkins..." );
 * ... activity on pumpkins that calls update() on each pumpkin ...
 * pl.done();
 * </PRE>
 * <p>
 * <P>A more flexible behaviour can be obtained at the end of the
 * process by calling {@link #stop()}:
 * <PRE>
 * ProgressLogger pl = new ProgressLogger( logger, 1, TimeUnit.MINUTES, "pumpkins" );
 * pl.start( "Smashing pumpkins..." );
 * ... activity on pumpkins that calls update() on each pumpkin ...
 * pl.stop( "Really done!" );
 * pl.logger.info( pl.toString() );
 * </PRE>
 * <p>
 * <P>An instance of this class can also be used as a handy timer:
 * <PRE>
 * ProgressLogger pl = new ProgressLogger();
 * pl.start( "Smashing pumpkins..." );
 * ... activity on pumpkins (no update() calls) ...
 * pl.done( howManyPumpkins );
 * </PRE>
 * <p>
 * <P>Should you need to display additional information, you can set the field {@link #info} to any
 * object: it will be printed just after the timing (and possibly memory) information.
 *
 * @author Sebastiano Vigna
 * @since 0.9.3
 */

public final class ProgressLogger {
    public final static long ONE_SECOND = 1000;
    public final static long TEN_SECONDS = 10 * ONE_SECOND;
    public final static long ONE_MINUTE = ONE_SECOND * 60;
    public final static long TEN_MINUTES = ONE_MINUTE * 10;
    public final static long ONE_HOUR = ONE_MINUTE * 60;
    public final static long DEFAULT_LOG_INTERVAL = TEN_SECONDS;

    /**
     * An array of pattern defining rules that turn plural into singular (the corresponding replacement string is in the same position in {@link #SINGULAR}).
     * More specific rules are at the end of the array (and should be tested first).
     */
    private static final Pattern[] PLURAL = {
            Pattern.compile("s$"),
            Pattern.compile("(s|si|u)s$"),
            Pattern.compile("(n)ews$"),
            Pattern.compile("([ti])a$"),
            Pattern.compile("((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$"),
            Pattern.compile("(^analy)ses$"),
            Pattern.compile("(^analy)sis$"),
            Pattern.compile("([^f])ves$"),
            Pattern.compile("(hive)s$"),
            Pattern.compile("(tive)s$"),
            Pattern.compile("([lr])ves$"),
            Pattern.compile("([^aeiouy]|qu)ies$"),
            Pattern.compile("(s)eries$"),
            Pattern.compile("(m)ovies$"),
            Pattern.compile("(x|ch|ss|sh)es$"),
            Pattern.compile("([m|l])ice$"),
            Pattern.compile("(bus)es$"),
            Pattern.compile("(o)es$"),
            Pattern.compile("(shoe)s$"),
            Pattern.compile("(cris|ax|test)is$"),
            Pattern.compile("(cris|ax|test)es$"),
            Pattern.compile("(octop|vir)i$"),
            Pattern.compile("(octop|vir)us$"),
            Pattern.compile("(alias|status)es$"),
            Pattern.compile("(alias|status)$"),
            Pattern.compile("^(ox)en"),
            Pattern.compile("(vert|ind)ices$"),
            Pattern.compile("(matr)ices$"),
            Pattern.compile("(quiz)zes$"),
            Pattern.compile("^people$"),
            Pattern.compile("^men$"),
            Pattern.compile("^women$"),
            Pattern.compile("^children$"),
            Pattern.compile("^sexes$"),
            Pattern.compile("^moves$"),
            Pattern.compile("^stadiums$")
    };

    /**
     * Replacement strings for {@link #PLURAL}'s patterns.
     */
    private static final String[] SINGULAR = {
            "",
            "$1s",
            "$1ews",
            "$1um",
            "$1$2sis",
            "$1sis",
            "$1sis",
            "$1fe",
            "$1",
            "$1",
            "$1f",
            "$1y",
            "$1eries",
            "$1ovie",
            "$1",
            "$1ouse",
            "$1",
            "$1",
            "$1",
            "$1is",
            "$1is",
            "$1us",
            "$1us",
            "$1",
            "$1",
            "$1",
            "$1ex",
            "$1ix",
            "$1",
            "person",
            "man",
            "woman",
            "child",
            "sex",
            "move",
            "stadium"
    };

    /**
     * Calls to {@link #lightUpdate()} will cause a call to
     * {@link System#currentTimeMillis()} only if the current value of {@link #count}
     * is a multiple of this mask plus one.
     */
    public final int LIGHT_UPDATE_MASK = (1 << 10) - 1;

    /**
     * The <a href="http://www.slf4j.org/">SLF4J</a> logger used by this progress logger.
     */
    public final Logger logger;
    /**
     * The time interval for a new log in milliseconds. Can be set at any time (e.g., using {@link TimeUnit#toMillis(long)}).
     */
    public long logInterval;
    /**
     * If non-{@code null}, this object will be printed after the timing information.
     */
    public Object info;
    /**
     * The number of calls to {@link #update()} since the last {@link #start()} (but it be changed also with {@link #update(long)} and {@link #set(long)}).
     */
    public long count;
    /**
     * The value of {@link #count} at the last call to {@link #updateInternal(long)} (i.e., at the last output).
     */
    private long lastCount;
    /**
     * The number of expected calls to {@link #update()} (used to compute the percentages, ignored if negative).
     */
    public long expectedUpdates;
    /**
     * The name of several counted items.
     */
    public String itemsName;
    /**
     * Whether to display the free memory at each progress log (default: false).
     */
    public boolean displayFreeMemory;
    /**
     * Whether to display additionally the local speed, that is, the detected speed between two consecutive logs, as opposed to the average speed since {@link #start()} (default: false).
     */
    public boolean displayLocalSpeed;
    /**
     * A fixed time unit for printing the speed. If {@code null}, {@link ProgressLogger} will choose a time unit that
     * is easy to understand. In some cases (e.g., machine-parsed logs) you might want to have always the speed in
     * items per {@linkplain TimeUnit#SECONDS seconds}, {@linkplain TimeUnit#MINUTES minues}, {@linkplain TimeUnit#HOURS hours} or {@linkplain TimeUnit#DAYS days}.
     */
    public TimeUnit speedTimeUnit;
    /**
     * A fixed time unit for printing the timing of an item. If {@code null}, {@link ProgressLogger} chooses a unit that
     * is easy to understand. In some cases (e.g., machine-parsed logs) you might want to have always have the time for
     * an item in {@linkplain TimeUnit#NANOSECONDS nanoseconds}, {@linkplain TimeUnit#MICROSECONDS milliseconds}, {@linkplain TimeUnit#MILLISECONDS milliseconds}, {@linkplain TimeUnit#SECONDS seconds}, {@linkplain TimeUnit#MINUTES minutes} or {@linkplain TimeUnit#HOURS hours}.
     */
    public TimeUnit itemTimeUnit;

    /**
     * The name of a single counted item, computed by {@link #()} on {@link #referenceItemsName} and cached (we want to avoid a costly scan of
     * {@link #SINGULAR}'s patterns at every output).
     */
    private String itemName;
    /**
     * The value of {@link #itemsName} for which {@link #itemName} is valid.
     */
    private String referenceItemsName;
    /**
     * The time at the last call to {@link #start()}.
     */
    private long startTime;
    /**
     * The time at the last call to {@link #stop()}.
     */
    private long stopTime;
    /**
     * The time of the last log.
     */
    private long lastLogTime;

    /**
     * Creates a new progress logger using <code>items</code> as items name and logging every
     * {@value #DEFAULT_LOG_INTERVAL} milliseconds
     * to the {@linkplain Logger#ROOT_LOGGER_NAME root logger}.
     */
    public ProgressLogger() {
        this(LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME));
    }

    /**
     * Creates a new progress logger logging every {@value #DEFAULT_LOG_INTERVAL} milliseconds
     * to the {@linkplain Logger#ROOT_LOGGER_NAME root logger}.
     *
     * @param itemsName a plural name denoting the counted items.
     */
    public ProgressLogger(final String itemsName) {
        this(LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME), itemsName);
    }

    /**
     * Creates a new progress logger using <code>items</code> as items name and logging every {@value #DEFAULT_LOG_INTERVAL} milliseconds.
     *
     * @param logger the logger to which messages will be sent.
     */
    public ProgressLogger(final Logger logger) {
        this(logger, DEFAULT_LOG_INTERVAL, TimeUnit.MILLISECONDS);
    }

    /**
     * Creates a new progress logger logging every {@value #DEFAULT_LOG_INTERVAL} milliseconds.
     *
     * @param logger    the logger to which messages will be sent.
     * @param itemsName a plural name denoting the counted items.
     */
    public ProgressLogger(final Logger logger, final String itemsName) {
        this(logger, DEFAULT_LOG_INTERVAL, TimeUnit.MILLISECONDS, itemsName);
    }

    /**
     * Creates a new progress logger using <code>items</code> as items name.
     *
     * @param logger      the logger to which messages will be sent.
     * @param logInterval the logging interval.
     * @param timeUnit    the unit of time of {@code logInterval}.
     */
    public ProgressLogger(final Logger logger, final long logInterval, final TimeUnit timeUnit) {
        this(logger, logInterval, timeUnit, "items");
    }

    /**
     * Creates a new progress logger.
     *
     * @param logger      the logger to which messages will be sent.
     * @param logInterval the logging interval.
     * @param timeUnit    the unit of time of {@code logInterval}.
     * @param itemsName   a plural name denoting the counted items.
     */
    public ProgressLogger(final Logger logger, final long logInterval, final TimeUnit timeUnit, final String itemsName) {
        this.logger = logger;
        this.logInterval = timeUnit.toMillis(logInterval);
        this.itemsName = itemsName;
        this.expectedUpdates = -1;
    }

    /**
     * The <a href="http://www.slf4j.org/">SLF4J</a> logger
     * used by this progress logger; it just returns the content of the field {@link #logger}.
     */
    public Logger logger() {
        return logger;
    }

    private String itemName() {
        if (Objects.equals(referenceItemsName, itemsName)) {
            return itemName;
        }
        referenceItemsName = itemsName;

        for (int i = PLURAL.length; i-- != 0; ) {
            final Matcher matcher = PLURAL[i].matcher(itemsName);
            if (matcher.find()) {
                return itemName = matcher.replaceFirst(SINGULAR[i]);
            }
        }
        return itemName = itemsName;
    }

    /**
     * Updates the internal count of this progress logger by adding one; if enough time has passed since the
     * last log, information will be logged.
     * <p>
     * <p>This method is kept intentionally short (it delegates most of the work to an internal
     * private method) so to suggest inlining. However, it performs a call to {@link System#currentTimeMillis()}
     * that takes microseconds (not nanoseconds). If you plan on calling this method more than a
     * few thousands times per second, you should use {@link #lightUpdate()}.
     */
    public void update() {
        update(1);
    }

    /**
     * Updates the internal count of this progress logger by adding a specified value; if enough time has passed since the
     * last log, information will be logged.
     *
     * @see #update()
     */
    public void update(final long count) {
        this.count += count;
        final long time = System.currentTimeMillis();
        if (time - lastLogTime >= logInterval) {
            updateInternal(time);
        }
    }

    /**
     * Updates the internal count of this progress logger by adding one, forcing a display.
     *
     * @see #update()
     */
    public void updateAndDisplay() {
        updateAndDisplay(1);
    }

    /**
     * Sets the internal count of this progress logger to a specified value; if enough time has passed since the
     * last log, information will be logged.
     *
     * @see #update()
     */
    public void set(final long count) {
        this.count = count;
        final long time = System.currentTimeMillis();
        if (time - lastLogTime >= logInterval) {
            updateInternal(time);
        }
    }

    /**
     * Sets the internal count of this progress logger to a specified value, forcing a display.
     *
     * @see #update()
     */
    public void setAndDisplay(final long count) {
        this.count = count;
        updateInternal(System.currentTimeMillis());
    }

    /**
     * Updates the internal count of this progress logger by adding a specified value, forcing a display.
     *
     * @see #update()
     */
    public void updateAndDisplay(final long count) {
        this.count += count;
        updateInternal(System.currentTimeMillis());
    }

    private String freeMemory() {
        return (displayFreeMemory ? "; used/avail/free/total/max mem: "
                + Util.formatSize(RUNTIME.totalMemory() - RUNTIME.freeMemory()) + "/"
                + Util.formatSize(RUNTIME.freeMemory() + (RUNTIME.maxMemory() - RUNTIME.totalMemory())) + "/"
                + Util.formatSize(RUNTIME.freeMemory()) + "/"
                + Util.formatSize(RUNTIME.totalMemory()) + "/"
                + Util.formatSize(RUNTIME.maxMemory()) : "");
    }


    private String itemsPerTimeInterval(long startCount, final long currentTime, long baseTime) {
        final double secondsPerItem = ((count - startCount) * 1000.0) / (currentTime - baseTime);
        if (speedTimeUnit == TimeUnit.SECONDS || speedTimeUnit == null && secondsPerItem >= 1) {
            return Util.format(secondsPerItem) + " " + itemsName + "/s";
        }
        if (speedTimeUnit == TimeUnit.MINUTES || speedTimeUnit == null && secondsPerItem * 60 >= 1) {
            return Util.format(secondsPerItem * 60) + " " + itemsName + "/m";
        }
        if (speedTimeUnit == TimeUnit.HOURS || speedTimeUnit == null && secondsPerItem * 3600 >= 1) {
            return Util.format(secondsPerItem * 3600) + " " + itemsName + "/h";
        }
        return Util.format(secondsPerItem * 86400) + " " + itemsName + "/d";
    }

    private String timePerItem(long startCount, final long currentTime, long baseTime) {
        final double secondsPerItem = (currentTime - baseTime) / ((count - startCount) * 1000.0);
        if (itemTimeUnit == null && secondsPerItem >= 86400) {
            return Util.format(secondsPerItem / 86400) + " d/" + itemName();
        }

        if (itemTimeUnit == TimeUnit.HOURS || itemTimeUnit == null && secondsPerItem >= 3600) {
            return Util.format(secondsPerItem / 3600) + " h/" + itemName();
        }
        if (itemTimeUnit == TimeUnit.MINUTES || itemTimeUnit == null && secondsPerItem >= 60) {
            return Util.format(secondsPerItem / 60) + " m/" + itemName();
        }
        if (itemTimeUnit == TimeUnit.SECONDS || itemTimeUnit == null && secondsPerItem >= 1) {
            return Util.format(secondsPerItem) + " s/" + itemName();
        }

        if (itemTimeUnit == TimeUnit.MILLISECONDS || itemTimeUnit == null && secondsPerItem >= 1E-3) {
            return Util.format(secondsPerItem * 1E3) + " ms/" + itemName();
        }
        if (itemTimeUnit == TimeUnit.MICROSECONDS || itemTimeUnit == null && secondsPerItem >= 1E-6) {
            return Util.format(secondsPerItem * 1E6) + " \u00b5s/" + itemName();
        }
        return Util.format(secondsPerItem * 1E9) + " ns/" + itemName();
    }

    private void updateInternal(final long currentTime) {
        final long millisToEnd = Math.round((expectedUpdates - count) * ((currentTime - startTime) / (count + 1.0)));
        // Formatting is expensive, so we check for actual logging.
        if (logger().isInfoEnabled()) {
            logger().info(Util.format(count) + " " + itemsName + ", " +
                    millis2hms(millis()) + ", " + itemsPerTimeInterval(0, currentTime, startTime) + ", " + timePerItem(0, currentTime, startTime) +
                    (displayLocalSpeed ? " [" + itemsPerTimeInterval(lastCount, currentTime, lastLogTime) + ", " + timePerItem(lastCount, currentTime, lastLogTime) + "]" : "") +
                    (expectedUpdates > 0 ? "; " + Util.format((100 * count) / expectedUpdates) + "% done, " +
                            millis2hms(millisToEnd) + " to end" : "") + freeMemory() + (info != null ? "; " + info : ""));
        }

        lastLogTime = currentTime;
        lastCount = count;
    }

    /**
     * Updates the internal count of this progress logger by adding one in a lightweight fashion.
     * <p>
     * <P>This call updates the progress logger internal counter as {@link #update()}. However,
     * it will actually call {@link System#currentTimeMillis()} only if the new {@link #count}
     * is a multiple of {@link #LIGHT_UPDATE_MASK} + 1. This mechanism makes it possible to reduce the number of
     * calls to {@link System#currentTimeMillis()} significantly.
     * <p>
     * <p>This method is useful when the operations being counted take less than a few microseconds.
     *
     * @see #update()
     */

    public final void lightUpdate() {
        if ((++count & LIGHT_UPDATE_MASK) == 0) {
            final long time = System.currentTimeMillis();
            if (time - lastLogTime >= logInterval) {
                updateInternal(time);
            }
        }
    }


    /**
     * Starts the progress logger, resetting the count.
     */
    public void start() {
        start(null, 0);
    }

    /**
     * Starts the progress logger, displaying a message and resetting the count.
     *
     * @param message the message to display.
     */

    public void start(final CharSequence message) {
        start(message, 0);
    }


    /**
     * Starts the progress logger, resetting the count and assuming that a given amount of time has already passed.
     *
     * @param alreadyElapsed the number of milliseconds already elapsed.
     * @see #start(CharSequence, long)
     */

    public void start(final long alreadyElapsed) {
        start(null, alreadyElapsed);
    }

    /**
     * Starts the progress logger, displaying a message, resetting the count and assuming that a given amount of time has already passed.
     * <p>
     * <p>The effect of the {@code alreadyElapsed} parameter is that the start time of this {@link ProgressLogger} will be
     * set to {@link System#currentTimeMillis()} minus {@code alreadyElapsed}.
     *
     * @param message        the message to display.
     * @param alreadyElapsed the number of milliseconds already elapsed.
     */

    public void start(final CharSequence message, final long alreadyElapsed) {
        if (message != null) {
            logger().info(message.toString());
        }
        startTime = (lastLogTime = System.currentTimeMillis()) - alreadyElapsed;
        lastCount = count = 0;
        stopTime = -1;
    }

    /**
     * Stops the progress logger, displaying a message.
     * <p>
     * <p>This method will also mark {@link #expectedUpdates} as invalid,
     * to avoid erroneous reuses of previous values.
     *
     * @param message the message to display.
     */

    public void stop(final CharSequence message) {
        if (stopTime != -1) {
            return;
        }
        if (message != null) {
            logger().info(message.toString());
        }
        stopTime = System.currentTimeMillis();
        expectedUpdates = -1;
    }

    /**
     * Stops the progress logger.
     */

    public void stop() {
        stop(null);
    }

    /**
     * Completes a run of this progress logger, logging &ldquo;Completed.&rdquo; and the logger itself.
     */
    public void done() {
        stop("Completed.");
        logger().info(toString());
    }

    /**
     * Completes a run of this progress logger and sets the internal counter, logging &ldquo;Completed.&rdquo; and the logger itself.
     * <p>
     * <p>This method is particularly useful in two circumstances:
     * <ul>
     * <li>you have updated the logger with some approximate values (e.g., in a multicore computation) but before
     * printing the final statistics you want the internal counter to contain an exact value;
     * <li>you have used the logger as a handy timer, calling just {@link #start()} and this method.
     * </ul>
     *
     * @param count will replace the internal counter value.
     */
    public void done(long count) {
        this.count = count;
        stop("Completed.");
        logger().info(toString());
    }

    /**
     * Returns the number of milliseconds between present time and the last call to {@link #start()}, if
     * this progress logger is running, or between the last call to {@link #stop()} and the last call to {@link #start()}, if this
     * progress logger is stopped.
     *
     * @return the number of milliseconds between present time and the last call to {@link #start()}, if
     * this progress logger is running, or between the last call to {@link #stop()} and the last call to {@link #start()}, if this
     * progress logger is stopped.
     */

    public long millis() {
        if (stopTime != -1) {
            return stopTime - startTime;
        } else {
            return System.currentTimeMillis() - startTime;
        }
    }

    private String millis2hms(final long t) {
        if (t < 1000) {
            return t + "ms";
        }
        final long s = (t / 1000) % 60;
        final long m = ((t / 1000) / 60) % 60;
        final long h = t / (3600 * 1000);
        if (h == 0 && m == 0) {
            return s + "s";
        }
        if (h == 0) {
            return m + "m " + s + "s";
        }
        return h + "h " + m + "m " + s + "s";
    }

    /**
     * Converts the data currently stored in this progress logger to a string.
     * <p>
     * <p>If this progress logger has been {@linkplain #stop() stopped}, statistics
     * are computed using the stop time. Otherwise, they are computed using the current time (i.e., the method call time).
     *
     * @return the current data in this progress logger in a printable form.
     */
    public String toString() {
        final long t = (stopTime != -1 ? stopTime : System.currentTimeMillis()) - startTime + 1;

        if (t <= 0) {
            return "Illegal progress logger state";
        }

        return "Elapsed: " + millis2hms(t) + (count != 0 ? " [" + Util.format(count) + " " + itemsName + ", " + itemsPerTimeInterval(0, stopTime, startTime) + ", " + timePerItem(0, stopTime, startTime) + "]" : "") + freeMemory();
    }
}
