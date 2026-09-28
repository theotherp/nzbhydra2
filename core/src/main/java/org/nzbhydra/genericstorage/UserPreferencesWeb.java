package org.nzbhydra.genericstorage;

import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.Jackson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
public class UserPreferencesWeb {

    @Autowired
    private UserPreferences userPreferences;

    @GetMapping(value = "/internalapi/userpreferences", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getUserPreferences(HttpServletRequest request) {
        return userPreferences.get(request.getRemoteUser());
    }

    @PutMapping(value = "/internalapi/userpreferences/{section}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public void putUserPreferenceSection(@PathVariable String section, @RequestBody(required = false) Object value, HttpServletRequest request) {
        try {
            userPreferences.put(request.getRemoteUser(), section, value == null ? null : Jackson.JSON_MAPPER.valueToTree(value));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (UserPreferences.RecordTooLargeException e) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, e.getMessage());
        }
    }

}
