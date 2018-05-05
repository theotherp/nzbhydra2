/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra;

import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DevEndpoint {

    @Autowired
    private InfoProvider infoProvider;

    private static final Logger logger = LoggerFactory.getLogger(DevEndpoint.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/dev", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public String convertMovie(@RequestParam(value = "imdb", required = false) String imdb, @RequestParam(value = "tmdb", required = false) String tmdb) throws InfoProviderException {
        if (imdb != null) {
            return infoProvider.convert(imdb, InfoProvider.IdType.IMDB).toString();
        } else if (tmdb != null) {
            return infoProvider.convert(tmdb, InfoProvider.IdType.TVDB).toString();
        } else {
            return "neither tmdb nor imdb set";
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/dev2", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public String convertTv(@RequestParam(value = "tvdb", required = false) String tvdb, @RequestParam(value = "tvmaze", required = false) String tvmaze) throws InfoProviderException {
        if (tvdb != null) {
            return infoProvider.convert(tvdb, InfoProvider.IdType.TVDB).toString();
        } else if (tvmaze != null) {
            return infoProvider.convert(tvmaze, InfoProvider.IdType.TVMAZE).toString();
        } else {
            return "neither tvdb nor tvmaze set";
        }
    }

}
