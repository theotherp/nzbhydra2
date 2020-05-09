/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.genericstorage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
public class GenericStorageWeb {

    @Autowired
    private GenericStorage genericStorage;

    @RequestMapping(value = "/internalapi/genericstorage/{key}", method = RequestMethod.GET)
    public Object get(@PathVariable String key, @RequestParam boolean forUser, HttpServletRequest request) {
        String keyToUse = key;
        if (forUser && request.getRemoteUser() != null) {
            keyToUse = key + "-" + request.getRemoteUser();
        }
        return genericStorage.get(keyToUse, Object.class).orElse(null);
    }

    @RequestMapping(value = "/internalapi/genericstorage/{key}", method = RequestMethod.PUT)
    public void put(@PathVariable String key, @RequestParam boolean forUser, @RequestBody String data, HttpServletRequest request) {
        String keyToUse = key;
        if (forUser && request.getRemoteUser() != null) {
            keyToUse = key + "-" + request.getRemoteUser();
        }
        genericStorage.save(keyToUse, data);
    }


}
