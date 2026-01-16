

package org.nzbhydra.mapping.newznab.xml;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlRootElement;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.StringJoiner;

@XmlRootElement(name = "error")
@XmlAccessorType(XmlAccessType.FIELD)
@AllArgsConstructor
@NoArgsConstructor
@Data
@ReflectionMarker
public class NewznabXmlError extends Xml {

    @XmlAttribute
    private String code;

    @XmlAttribute
    private String description;

    @Override
    public String toString() {
        return new StringJoiner(", ", NewznabXmlError.class.getSimpleName() + "[", "]")
                .add("code='" + code + "'")
                .add("message='" + description + "'")
                .toString();
    }
}
