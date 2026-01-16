

package org.nzbhydra;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.xml.bind.Marshaller;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;

import javax.xml.transform.stream.StreamSource;
import java.io.StringReader;
import java.util.HashMap;
import java.util.Map;

public class Jackson {

    public static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());
    public static final ObjectMapper JSON_MAPPER = new ObjectMapper();
    public static final ObjectMapper XML_MAPPER = new XmlMapper();

    public static Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
    public static final ObjectWriter YAML_WRITER;

    static {

        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        DefaultPrettyPrinter defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
        YAML_MAPPER.registerModule(new Jdk8Module());
        YAML_MAPPER.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        YAML_MAPPER.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        YAML_WRITER = YAML_MAPPER.writer(defaultPrettyPrinter);


        JSON_MAPPER.registerModule(new Jdk8Module());
        JSON_MAPPER.registerModule(new JavaTimeModule());
        JSON_MAPPER.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

        XML_MAPPER.registerModule(new JavaTimeModule());
        XML_MAPPER.registerModule(new Jdk8Module());

        Map<String, Boolean> map = new HashMap<>();
        map.put(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);
        marshaller.setMarshallerProperties(map);
        marshaller.setPackagesToScan("org.nzbhydra");
    }

    public static <T> T getUnmarshal(String body) {
        try (StringReader reader = new StringReader(body)) {
            return (T) Jackson.marshaller.unmarshal(new StreamSource(reader));


        }
    }
}
