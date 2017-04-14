package org.nzbhydra;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GenericResponse {

    private boolean successful;
    private String message;

    public static GenericResponse ok() {
        return new GenericResponse(true, null);
    }

}
