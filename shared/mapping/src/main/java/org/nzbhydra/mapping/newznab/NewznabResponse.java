

package org.nzbhydra.mapping.newznab;


import jakarta.xml.bind.JAXB;

import java.io.IOException;
import java.io.StringWriter;

public abstract class NewznabResponse {

    public enum SearchType {
        JSON,
        NEWZNAB,
        TORZNAB

    }

    public abstract String getContentHeader();

    public abstract SearchType getSearchType();

    public abstract void setSearchType(NewznabResponse.SearchType searchType);

    public String toXmlString() {
        try (StringWriter writer = new StringWriter()) {
            JAXB.marshal(this, writer);
            return writer.toString();
        } catch (IOException e) {
            return null;
        }
    }

}
