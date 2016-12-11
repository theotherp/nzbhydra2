package org.nzbhydra.mapping;

import com.sun.xml.internal.bind.marshaller.NamespacePrefixMapper;

import java.util.HashMap;
import java.util.Map;

public class NewznabNamespacePrefixMapper extends NamespacePrefixMapper {

    private Map<String, String> namespaceMap = new HashMap<>();

    public NewznabNamespacePrefixMapper() {
        namespaceMap.put("http://www.newznab.com/DTD/2010/feeds/attributes/", "newznab");
    }


    @Override
    public String getPreferredPrefix(String namespaceUri, String suggestion, boolean requirePrefix) {
        return namespaceMap.getOrDefault(namespaceUri, suggestion);
    }

}