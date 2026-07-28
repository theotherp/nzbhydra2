

package org.nzbhydra;


import lombok.Data;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;

import java.util.List;
import java.util.Map;

@Data
public class HydraResponse {


    private final String body;
    private final int status;
    private final Map<String, List<String>> headers;
    private boolean throwExceptionOnErrorStatus = true;

    public HydraResponse(String body, int status, Map<String, List<String>> headers) {
        this.body = body;
        this.status = status;
        this.headers = headers;
    }

    public String body() {
        if (throwExceptionOnErrorStatus && status != 200) {
            throw new RuntimeException("Unsuccessful HTTP call. Status: " + status + ". Body:\n" + body);
        }
        return body;
    }

    public int status() {
        if (throwExceptionOnErrorStatus && status != 200) {
            throw new RuntimeException("Unsuccessful HTTP call. Status: " + status + ". Body:\n" + body);
        }
        return status;
    }


    public HydraResponse dontRaiseIfUnsuccessful() {
        throwExceptionOnErrorStatus = false;
        return this;
    }

    public String header(String name) {
        return headers.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(name))
                .findFirst()
                .flatMap(entry -> entry.getValue().stream().findFirst())
                .orElse(null);
    }

    public <T> T as(Class<T> clazz) {

        try {
            return Jackson.JSON_MAPPER
                    .readValue(body(), clazz);
        } catch (JacksonException e) {
            throw new RuntimeException(e);
        }
    }

    public <T> T as(TypeReference<T> tTypeReference) {
        try {
            return Jackson.JSON_MAPPER
                    .readValue(body(), tTypeReference);
        } catch (JacksonException e) {
            throw new RuntimeException(e);
        }
    }


}
