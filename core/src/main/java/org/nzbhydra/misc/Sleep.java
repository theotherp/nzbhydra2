package org.nzbhydra.misc;

public class Sleep {

    /**
     * Sleeps for the given time. If the thread is interrupted the sleep ends early and the interrupt flag is restored,
     * so callers can check {@link Thread#isInterrupted()} and stop what they are doing.
     */
    public static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

}
