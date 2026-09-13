package org.nzbhydra.mockserver.newznab;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.function.Function;

/**
 * Factories for the responses the mock server can give.
 */
public final class Respond {

    private Respond() {
    }

    /**
     * A response containing exactly the given items, with the offset 0 and the number of items as total, like the old
     * {@code getRssRoot(items, 0, items.size())} calls.
     */
    public static RootBehaviour items(Function<MockContext, List<NewznabXmlItem>> items) {
        return context -> {
            List<NewznabXmlItem> builtItems = items.apply(context);
            return NewznabMockBuilder.getRssRoot(builtItems, 0, builtItems.size());
        };
    }

    public static RootBehaviour generated(Function<MockContext, NewznabMockRequest> request) {
        return context -> NewznabMockBuilder.generateResponse(request.apply(context));
    }

    /**
     * A well formed response without any items and a total of 0.
     */
    public static RootBehaviour empty() {
        return generated(context -> NewznabMockRequest.builder()
                .numberOfResults(0)
                .titleBase(context.persona().titleBase())
                .titleWords(Collections.emptyList())
                .offset(0)
                .total(0)
                .build());
    }

    public static ResponseBehaviour rawXmlResource(String classpathResource) {
        return context -> new ResponseEntity<>(Resources.toString(Resources.getResource(classpathResource), Charsets.UTF_8), HttpStatus.OK);
    }

    public static ResponseBehaviour error(String code, String description) {
        return context -> new ResponseEntity<>(new NewznabXmlError(code, description), HttpStatus.OK);
    }

    public static ResponseBehaviour status(HttpStatus status) {
        return context -> new ResponseEntity<>(status);
    }

    public static ResponseBehaviour body(Object body, HttpStatus status) {
        return context -> new ResponseEntity<>(body, status);
    }

    /**
     * Sleeps without answering the request, see {@link DelayBehaviour}.
     */
    public static DelayBehaviour delay(Duration duration) {
        return context -> duration;
    }

    public static DelayBehaviour delay(Function<MockContext, Duration> duration) {
        return duration::apply;
    }

}
