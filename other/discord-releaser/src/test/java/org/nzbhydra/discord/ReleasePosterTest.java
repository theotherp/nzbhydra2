package org.nzbhydra.discord;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReleasePosterTest {

    private FakeChannel channel;
    private ReleasePoster poster;

    @BeforeEach
    void setUp() {
        channel = new FakeChannel();
        poster = new ReleasePoster(3, 2, 0, millis -> {
        });
    }

    @Test
    void shouldPostEachPartOnce() {
        poster.post(channel, List.of("part one", "part two"));

        assertThat(channel.messages).containsExactly("part two", "part one");
        assertThat(channel.sendCalls).isEqualTo(2);
    }

    @Test
    void shouldSkipPartsThatWereAlreadyPosted() {
        channel.messages.add("part one");

        poster.post(channel, List.of("part one", "part two"));

        assertThat(channel.messages).containsExactly("part two", "part one");
        assertThat(channel.sendCalls).isEqualTo(1);
    }

    // What happened with 9.3.0: the request reached Discord but the response timed out
    @Test
    void shouldNotSendAgainWhenATimedOutSendWasPostedAnyway() {
        channel.failNextSends(1, true);

        poster.post(channel, List.of("announcement"));

        assertThat(channel.messages).containsExactly("announcement");
        assertThat(channel.sendCalls).isEqualTo(1);
    }

    @Test
    void shouldRetryWhenAFailedSendWasNotPosted() {
        channel.failNextSends(1, false);

        poster.post(channel, List.of("announcement"));

        assertThat(channel.messages).containsExactly("announcement");
        assertThat(channel.sendCalls).isEqualTo(2);
    }

    @Test
    void shouldFailAfterTheLastAttemptWithoutPostingTwice() {
        channel.failNextSends(3, false);

        assertThatThrownBy(() -> poster.post(channel, List.of("announcement")))
                .isInstanceOf(ReleasePoster.PostingFailedException.class)
                .hasMessageContaining("after 3 attempts");
        assertThat(channel.messages).isEmpty();
        assertThat(channel.sendCalls).isEqualTo(3);
    }

    @Test
    void shouldFailWhenAReportedSendIsMissingFromTheChannel() {
        channel.dropSentMessages = true;

        assertThatThrownBy(() -> poster.post(channel, List.of("announcement")))
                .isInstanceOf(ReleasePoster.PostingFailedException.class)
                .hasMessageContaining("missing in #releases after posting");
    }

    @Test
    void shouldMatchPostedMessagesIgnoringSurroundingWhitespace() {
        channel.messages.add("announcement\n");

        poster.post(channel, List.of("  announcement"));

        assertThat(channel.sendCalls).isZero();
    }

    private static class FakeChannel implements ReleasePoster.Channel {
        // Newest first, like Discord's history
        private final List<String> messages = new ArrayList<>();
        private int sendCalls;
        private int failuresLeft;
        private boolean postDespiteFailure;
        private boolean dropSentMessages;

        void failNextSends(int count, boolean postDespiteFailure) {
            this.failuresLeft = count;
            this.postDespiteFailure = postDespiteFailure;
        }

        @Override
        public String name() {
            return "releases";
        }

        @Override
        public List<String> recentOwnMessages() {
            return List.copyOf(messages);
        }

        @Override
        public void send(String content) {
            sendCalls++;
            if (failuresLeft > 0) {
                failuresLeft--;
                if (postDespiteFailure) {
                    messages.add(0, content);
                }
                throw new RuntimeException(new SocketTimeoutException("timeout"));
            }
            if (!dropSentMessages) {
                messages.add(0, content);
            }
        }
    }
}
