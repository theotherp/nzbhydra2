

package org.nzbhydra.mapping.newznab.xml;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Objects;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlChannel {

    private String title;
    private String description;
    private String link;
    private String language;
    private String webMaster;
    private String generator;

    @XmlElement(name = "response", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JsonProperty("response")
    private NewznabXmlResponse newznabResponse;

    @XmlElement(name = "apilimits", namespace = "http://www.newznab.com/DTD/2010/feeds/attributes/")
    @JsonProperty("apilimits")
    private NewznabXmlApilimits apiLimits;

    @XmlElement(name = "item")
    private List<NewznabXmlItem> items = new ArrayList<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        NewznabXmlChannel that = (NewznabXmlChannel) o;
        return Objects.equal(title, that.title) &&
                Objects.equal(link, that.link) &&
                Objects.equal(newznabResponse, that.newznabResponse) &&
                Objects.equal(items, that.items);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(title, link, newznabResponse, items);
    }
}
