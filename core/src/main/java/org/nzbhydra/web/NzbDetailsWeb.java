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

package org.nzbhydra.web;

import org.nzbhydra.searching.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class NzbDetailsWeb {

    @Autowired
    private SearchResultRepository searchResultRepository;

    private static final Logger logger = LoggerFactory.getLogger(NzbDetailsWeb.class);

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/details/{guid}", method = RequestMethod.GET)
    public RedirectView details(@PathVariable("guid") long guid) {
        RedirectView redirectView = new RedirectView();
        String url = searchResultRepository.findOne(guid).getDetails();
        redirectView.setUrl(url);
        logger.debug("Redirecting to {} for GUID {}", url, guid);
        return redirectView;
    }

}
