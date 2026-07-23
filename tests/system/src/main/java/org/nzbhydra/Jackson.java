

package org.nzbhydra;

import jakarta.xml.bind.Marshaller;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import tools.jackson.core.util.DefaultIndenter;
import tools.jackson.core.util.DefaultPrettyPrinter;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.ObjectWriter;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.dataformat.yaml.YAMLMapper;

import javax.xml.transform.stream.StreamSource;
import java.io.StringReader;
import java.util.HashMap;
import java.util.Map;

public class Jackson {

    public static final ObjectMapper YAML_MAPPER = new YAMLMapper();
    public static final ObjectMapper JSON_MAPPER = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    public static Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
    public static final ObjectWriter YAML_WRITER;

    static {

        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        DefaultPrettyPrinter defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
        YAML_WRITER = YAML_MAPPER.writer().with(defaultPrettyPrinter);

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
