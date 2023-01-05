package org.nzbhydra;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class GenericResponse {

    private boolean successful;
    private String message;

    public static GenericResponse ok() {
        return new GenericResponse(true, null);
    }

    public static GenericResponse ok(String message) {
        return new GenericResponse(true, message);
    }

    public static GenericResponse notOk(String message) {
        return new GenericResponse(false, message);
    }

}
