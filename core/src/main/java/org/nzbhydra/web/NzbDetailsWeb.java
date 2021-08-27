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

package org.nzbhydra.web;

import com.google.common.base.Strings;
import com.google.common.net.UrlEscapers;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Optional;

@Controller
public class NzbDetailsWeb {

    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private ConfigProvider configProvider;

    private static final Logger logger = LoggerFactory.getLogger(NzbDetailsWeb.class);

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/details/{guid}", method = RequestMethod.GET)
    public RedirectView details(@PathVariable("guid") long guid) {
        RedirectView redirectView = new RedirectView();
        String url = searchResultRepository.findById(guid).get().getDetails();
        Optional<String> derefererOptional = configProvider.getBaseConfig().getMain().getDereferer();
        if (derefererOptional.isPresent() && !Strings.isNullOrEmpty(derefererOptional.get())) {
            url = derefererOptional.get()
                    .replace("$s", UrlEscapers.urlFragmentEscaper().escape(url)
                            .replace("$us", url));
        }
        redirectView.setUrl(url);
        logger.debug("Redirecting to {} for GUID {}", url, guid);
        return redirectView;
    }

}
