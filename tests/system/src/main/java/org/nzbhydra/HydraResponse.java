

package org.nzbhydra;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import lombok.Data;

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
                    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                    .readValue(body(), clazz);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public <T> T as(TypeReference<T> tTypeReference) {
        try {
            return Jackson.JSON_MAPPER
                    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                    .readValue(body(), tTypeReference);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }


}
