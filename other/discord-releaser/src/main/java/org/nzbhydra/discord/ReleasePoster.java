package org.nzbhydra.discord;

import java.util.List;

/**
 * Posts the release announcement to one channel so that it ends up there exactly once.
 * <p>
 * A send that times out may still have reached Discord: the 9.3.0 announcement was posted twice because JDA retried a
 * timed-out request on its own and the run then failed anyway. So a send is never trusted blindly in either
 * direction. Parts the bot already posted are skipped, which also makes re-running after a failure safe; after a
 * failed send the channel is read back to see whether the message landed before sending again; and at the end every
 * part must be present in the channel.
 */
class ReleasePoster {

    /**
     * What the poster needs from a Discord channel. Implemented with JDA in {@link DiscordPublisher}.
     */
    interface Channel {
        String name();

        /**
         * Raw content of the bot's own most recent messages in the channel, newest first.
         */
        List<String> recentOwnMessages();

        void send(String content);
    }

    static class PostingFailedException extends RuntimeException {
        PostingFailedException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private final int maxSendAttempts;
    private final int readBackAttempts;
    private final long readBackDelayMillis;
    private final Sleeper sleeper;

    interface Sleeper {
        void sleep(long millis) throws InterruptedException;
    }

    ReleasePoster(int maxSendAttempts, int readBackAttempts, long readBackDelayMillis, Sleeper sleeper) {
        this.maxSendAttempts = maxSendAttempts;
        this.readBackAttempts = readBackAttempts;
        this.readBackDelayMillis = readBackDelayMillis;
        this.sleeper = sleeper;
    }

    static ReleasePoster withDefaults() {
        return new ReleasePoster(3, 3, 5_000, Thread::sleep);
    }

    void post(Channel channel, List<String> parts) {
        for (int i = 0; i < parts.size(); i++) {
            String part = parts.get(i).strip();
            String label = "part " + (i + 1) + "/" + parts.size() + " in #" + channel.name();
            if (isPosted(channel, part)) {
                System.out.println("Skipping " + label + ": already posted");
                continue;
            }
            postPart(channel, part, label);
        }
        for (int i = 0; i < parts.size(); i++) {
            if (!isPosted(channel, parts.get(i).strip())) {
                throw new PostingFailedException("Part " + (i + 1) + "/" + parts.size() + " is missing in #" + channel.name()
                        + " after posting. Check the channel before running again.", null);
            }
        }
        System.out.println("Verified all " + parts.size() + " part(s) in #" + channel.name());
    }

    private void postPart(Channel channel, String part, String label) {
        RuntimeException lastFailure = null;
        for (int attempt = 1; attempt <= maxSendAttempts; attempt++) {
            try {
                channel.send(part);
                System.out.println("Posted " + label);
                return;
            } catch (RuntimeException e) {
                lastFailure = e;
                if (DiscordPublisher.isPermissionError(e)) {
                    throw new PostingFailedException("The bot lacks permission to post in #" + channel.name()
                            + ". If it should have it, set the permissions in the channel manually for the bot.", e);
                }
                System.out.println("Sending " + label + " failed (attempt " + attempt + "/" + maxSendAttempts + "): " + e
                        + ". Checking whether it was posted anyway");
                if (waitUntilPosted(channel, part)) {
                    System.out.println("Posted " + label + " (the send reported a failure, but the message is in the channel)");
                    return;
                }
            }
        }
        throw new PostingFailedException("Could not post " + label + " after " + maxSendAttempts + " attempts", lastFailure);
    }

    private boolean waitUntilPosted(Channel channel, String part) {
        for (int i = 0; i < readBackAttempts; i++) {
            try {
                sleeper.sleep(readBackDelayMillis);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PostingFailedException("Interrupted while checking whether the message was posted", e);
            }
            try {
                if (isPosted(channel, part)) {
                    return true;
                }
            } catch (RuntimeException e) {
                System.out.println("Reading back #" + channel.name() + " failed: " + e);
            }
        }
        return false;
    }

    private static boolean isPosted(Channel channel, String part) {
        return channel.recentOwnMessages().stream().anyMatch(message -> message.strip().equals(part));
    }
}
