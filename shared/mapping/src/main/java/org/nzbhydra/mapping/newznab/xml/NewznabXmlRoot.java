

package org.nzbhydra.mapping.newznab.xml;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Objects;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;


@XmlRootElement(name = "rss")
@XmlAccessorType(XmlAccessType.FIELD)
@Data
@ReflectionMarker
public class NewznabXmlRoot extends Xml {

    @XmlAttribute
    private String version = "2.0";

    @XmlElement(name = "channel")
    @JsonProperty("channel")
    private NewznabXmlChannel rssChannel = new NewznabXmlChannel();

    @XmlElement(name = "error")
    @JsonProperty("error")
    private NewznabXmlError error;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        NewznabXmlRoot that = (NewznabXmlRoot) o;
        return Objects.equal(rssChannel, that.rssChannel) &&
                Objects.equal(error, that.error);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(rssChannel, error);
    }
}
