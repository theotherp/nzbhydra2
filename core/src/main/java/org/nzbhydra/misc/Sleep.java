package org.nzbhydra.misc;

public class Sleep {

    public static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            throw new RuntimeException();
        }
    }

}
