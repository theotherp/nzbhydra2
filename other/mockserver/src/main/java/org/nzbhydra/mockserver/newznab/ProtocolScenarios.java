package org.nzbhydra.mockserver.newznab;

import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Protocol level answers that come before any search handling.
 *
 * <p>The caps and getnfo requests are answered by the controller itself; they are not scenarios because they are not
 * search behaviour. The controller keeps the original precedence between them and these two scenarios.</p>
 */
public final class ProtocolScenarios {

    public static final String TOO_MANY_REQUESTS_APIKEY = "429";
    public static final String FORBIDDEN_QUERY = "403";

    private ProtocolScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(tooManyRequests(), forbidden());
    }

    public static Scenario tooManyRequests() {
        return new Scenario("protocol-too-many-requests",
                "API key 429 answers every request with HTTP 429 and no body",
                Match.apikey(TOO_MANY_REQUESTS_APIKEY),
                Respond.status(HttpStatus.TOO_MANY_REQUESTS));
    }

    public static Scenario forbidden() {
        return new Scenario("protocol-forbidden",
                "Query 403 answers with HTTP 403 and a plain text error body",
                Match.query(FORBIDDEN_QUERY),
                Respond.body("error body", HttpStatus.FORBIDDEN));
    }

}
