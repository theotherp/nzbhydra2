package org.nzbhydra.web;

import jakarta.xml.bind.Marshaller;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategories;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategory;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlLimits;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRetention;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlSearch;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlSearching;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlServer;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlIndexer;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlRoot;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;

import java.util.HashMap;
import java.util.Map;

@Configuration(proxyBeanMethods = false)
public class JaxbConfiguration {

    @Bean
    public Jaxb2Marshaller marshaller() {
        Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
        Map<String, Boolean> map = new HashMap<>();
        map.put(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);
        marshaller.setMarshallerProperties(map);
        // Native images do not expose classpath directories for JAXB package scanning.
        marshaller.setClassesToBeBound(
            NewznabAttribute.class,
            NewznabXmlApilimits.class,
            NewznabXmlChannel.class,
            NewznabXmlEnclosure.class,
            NewznabXmlError.class,
            NewznabXmlGuid.class,
            NewznabXmlItem.class,
            NewznabXmlResponse.class,
            NewznabXmlRoot.class,
            JacketCapsXmlIndexer.class,
            JacketCapsXmlRoot.class,
            CapsXmlCategories.class,
            CapsXmlCategory.class,
            CapsXmlLimits.class,
            CapsXmlServer.class,
            CapsXmlSearch.class,
            CapsXmlRoot.class,
            CapsXmlRetention.class,
            CapsXmlSearching.class,
            Xml.class);
        return marshaller;
    }
}
