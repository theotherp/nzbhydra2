

package org.nzbhydra;

import org.nzbhydra.config.EmptyStringToNullDeserializer;
import org.nzbhydra.config.EmptyStringToNullSerializer;
import org.nzbhydra.config.sensitive.SensitiveDataModule;
import tools.jackson.core.util.DefaultIndenter;
import tools.jackson.core.util.DefaultPrettyPrinter;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.ObjectWriter;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.dataformat.yaml.YAMLMapper;

public class Jackson {

    public static final ObjectMapper YAML_MAPPER = YAMLMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();
    public static final ObjectMapper SENSITIVE_YAML_MAPPER = YAMLMapper.builder()
            .addModule(new SensitiveDataModule())
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();
    public static final ObjectMapper JSON_MAPPER = JsonMapper.builder()
            .addModule(createSimpleModule())
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();
    public static final ObjectWriter YAML_WRITER;

    static {

        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        DefaultPrettyPrinter defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
        YAML_WRITER = YAML_MAPPER.writer().with(defaultPrettyPrinter);
    }

    private static SimpleModule createSimpleModule() {
        SimpleModule simpleModule = new SimpleModule();
        simpleModule.addDeserializer(String.class, new EmptyStringToNullDeserializer());
        simpleModule.addSerializer(String.class, new EmptyStringToNullSerializer());
        return simpleModule;
    }


}
