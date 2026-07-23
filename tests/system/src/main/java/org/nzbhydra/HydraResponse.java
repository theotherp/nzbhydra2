

package org.nzbhydra;


import lombok.Data;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;

@Data
public class HydraResponse {


    private final String body;
    private final int status;
    private boolean throwExceptionOnErrorStatus = true;

    public HydraResponse(String body, int status) {
        this.body = body;
        this.status = status;
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
