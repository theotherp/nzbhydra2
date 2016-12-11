package org.nzbhydra.api;

import org.nzbhydra.searching.SearchType;

import javax.persistence.AttributeConverter;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class EnumDatabaseConverter implements AttributeConverter<Enum, Integer> {

    private static Map<Class<? extends Enum>, Map<String, Integer>> mapClassToValue = new HashMap<>();
    private static Map<Integer, Enum> mapValueToClass = new HashMap<>();

    {
        addToMap(SearchType.class, 1);

    }

    private static void addToMap(Class<? extends Enum> enumToMap, int startKey) {
        Map<String, Integer> map = new HashMap<>();

        for (Enum e : Arrays.stream(enumToMap.getEnumConstants()).sorted(Comparator.comparing(Enum::name)).collect(Collectors.toList())) {
            int key = startKey++;
            map.put(e.name(), key);
            mapValueToClass.put(key, e);
        }
        mapClassToValue.put(enumToMap, map);
    }

    @Override
    public Integer convertToDatabaseColumn(Enum attribute) {
        return mapClassToValue.get(attribute.getClass()).get(attribute.name());
    }

    @Override
    public Enum convertToEntityAttribute(Integer dbData) {
        return mapValueToClass.get(dbData);
    }
}
