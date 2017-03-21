package org.nzbhydra.api;

import javax.persistence.AttributeConverter;

public class EnumDatabaseConverter implements AttributeConverter<Enum, String> {



    @Override
    public String convertToDatabaseColumn(Enum attribute) {
        return attribute.getClass() + "#" + attribute.name();

    }

    @Override
    public Enum convertToEntityAttribute(String dbData) {
        String[] split = dbData.split("#");

        try {
            Class<? extends Enum> enumClass = (Class<? extends Enum>) Class.forName(split[0]);
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
        return null;
    }
}
