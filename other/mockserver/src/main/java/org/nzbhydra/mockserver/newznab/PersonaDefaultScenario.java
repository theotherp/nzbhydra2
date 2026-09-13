package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;

import java.util.Collections;
import java.util.List;

/**
 * The tail of the original chain: however many results the API key's persona is configured for, clamped by offset and
 * limit.
 */
public final class PersonaDefaultScenario {

    private PersonaDefaultScenario() {
    }

    public static List<Scenario> scenarios() {
        return List.of(personaDefault());
    }

    public static Scenario personaDefault() {
        return new Scenario("persona-default",
                "Returns as many generated results as the API key's persona is configured for",
                Match.always(),
                behaviour());
    }

    /**
     * Also used by the scenarios that only decorate the default response (API limits, random ages).
     */
    public static RootBehaviour behaviour() {
        return Respond.generated(context -> NewznabMockRequest.builder()
                        .numberOfResults(numberOfResults(context))
                        .titleBase(context.apikey())
                        .generateDuplicates(context.generateDuplicates())
                        .titleWords(Collections.emptyList())
                        .offset(context.offset())
                        .build())
                .withTotal(PersonaDefaultScenario::numberOfResults);
    }

    static int numberOfResults(MockContext context) {
        int endIndex = context.persona().resultCount();
        if (context.params().getOffset() != null && context.params().getLimit() != null) {
            endIndex = Math.min(context.offset() + context.limit(), endIndex);
        }
        return endIndex;
    }

}
