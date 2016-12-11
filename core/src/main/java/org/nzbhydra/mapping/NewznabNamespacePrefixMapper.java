package org.nzbhydra.mapping;

import com.sun.xml.internal.bind.marshaller.NamespacePrefixMapper;

import java.util.HashMap;
import java.util.Map;

public class NewznabNamespacePrefixMapper extends NamespacePrefixMapper {

    private Map<String, String> namespaceMap = new HashMap<>();

    /**
     * Create mappings.
     */
    public NewznabNamespacePrefixMapper() {
        namespaceMap.put("http://www.newznab.com/DTD/2010/feeds/attributes/", "newznab");
        namespaceMap.put("http://purl.org/rss/1.0/modules/content/", "content");
    }

    /* (non-Javadoc)
     * Returning null when not found based on spec.
     * @see com.sun.xml.bind.marshaller.NamespacePrefixMapper#getPreferredPrefix(java.lang.String, java.lang.String, boolean)
     */
    @Override
    public String getPreferredPrefix(String namespaceUri, String suggestion, boolean requirePrefix) {
        return namespaceMap.getOrDefault(namespaceUri, suggestion);
    }
}