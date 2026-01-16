

package org.nzbhydra.genericstorage;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GenericStorageWeb {

    @Autowired
    private GenericStorage genericStorage;

    @RequestMapping(value = "/internalapi/genericstorage/{key}", method = RequestMethod.GET)
    public Object get(@PathVariable String key, @RequestParam(required = false) boolean forUser, HttpServletRequest request) {
        String keyToUse = key;
        if (forUser && request.getRemoteUser() != null) {
            keyToUse = key + "-" + request.getRemoteUser();
        }
        return genericStorage.get(keyToUse, Object.class).orElse(null);
    }

    @RequestMapping(value = "/internalapi/genericstorage/{key}", method = RequestMethod.PUT)
    public void put(@PathVariable String key, @RequestParam(required = false) boolean forUser, @RequestBody String data, HttpServletRequest request) {
        String keyToUse = key;
        if (forUser && request.getRemoteUser() != null) {
            keyToUse = key + "-" + request.getRemoteUser();
        }
        genericStorage.save(keyToUse, data);
    }


}
