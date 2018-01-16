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

import com.sun.xml.internal.bind.v2.runtime.JAXBContextImpl;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.xml.Jaxb2RootElementHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.annotation.XmlNs;
import javax.xml.transform.Result;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Configuration
@EnableWebMvc
public class HydraWebMvcConfigurerAdapter extends WebMvcConfigurerAdapter {

    //Super hacky code to remove the xmlns:torznab namespace from newznab results and vice versa
    //Didn't find another way to get rid of them short of duplicating all classes

    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.add(0, new Bla());
    }

    public class Bla extends Jaxb2RootElementHttpMessageConverter {
        private Set<XmlNs> xmlNsSet = null;
        @Override
        public boolean canWrite(Class<?> clazz, MediaType mediaType) {
            return NewznabXmlRoot.class.isAssignableFrom(clazz);
        }

        @Override
        protected boolean supports(Class<?> clazz) {
            return super.supports(clazz);
        }

        @Override
        protected void writeToResult(Object o, HttpHeaders headers, Result result) throws IOException {
            JAXBContext jaxbContext = this.getJaxbContext(NewznabXmlRoot.class);
            boolean isNewznab = ((NewznabXmlRoot) o).isNewznab();
            if (xmlNsSet == null) {
                xmlNsSet = new HashSet<>(((JAXBContextImpl) jaxbContext).getXmlNsSet());
            }
            ((JAXBContextImpl) jaxbContext).getXmlNsSet().clear();
            ((JAXBContextImpl) jaxbContext).getXmlNsSet().addAll(xmlNsSet);
            ((JAXBContextImpl) jaxbContext).getXmlNsSet().removeIf(xmlNs -> (xmlNs.prefix().equalsIgnoreCase("torznab") && isNewznab) || (xmlNs.prefix().equalsIgnoreCase("newznab") && !isNewznab));
           super.writeToResult(o, headers, result);
        }


    }


}
