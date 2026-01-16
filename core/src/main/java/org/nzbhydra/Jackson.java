

package org.nzbhydra;

import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.nzbhydra.config.EmptyStringToNullDeserializer;
import org.nzbhydra.config.EmptyStringToNullSerializer;
import org.nzbhydra.config.sensitive.SensitiveDataModule;

public class Jackson {

    public static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());
    public static final ObjectMapper SENSITIVE_YAML_MAPPER = new ObjectMapper(new YAMLFactory());
    public static final ObjectMapper JSON_MAPPER = new ObjectMapper();
    public static final ObjectWriter YAML_WRITER;

    static {

        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        DefaultPrettyPrinter defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
        YAML_MAPPER.registerModule(new Jdk8Module());
        YAML_MAPPER.registerModule(new JavaTimeModule());
        YAML_MAPPER.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        YAML_MAPPER.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        YAML_WRITER = YAML_MAPPER.writer(defaultPrettyPrinter);

        SENSITIVE_YAML_MAPPER.registerModule(new Jdk8Module());
        SENSITIVE_YAML_MAPPER.registerModule(new JavaTimeModule());
        SENSITIVE_YAML_MAPPER.registerModule(new SensitiveDataModule());

        JSON_MAPPER.registerModule(new Jdk8Module());
        JSON_MAPPER.registerModule(new JavaTimeModule());
        JSON_MAPPER.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

        SimpleModule simpleModule = new SimpleModule();
        simpleModule.addDeserializer(String.class, new EmptyStringToNullDeserializer());
        simpleModule.addSerializer(String.class, new EmptyStringToNullSerializer());
        JSON_MAPPER.registerModule(simpleModule);
    }


}
