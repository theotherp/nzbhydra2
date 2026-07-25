

package org.nzbhydra.searching.db;

import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.generator.BeforeExecutionGenerator;
import org.hibernate.generator.EventType;
import org.hibernate.generator.EventTypeSets;
import org.nzbhydra.searching.SearchResultIdCalculator;

import java.util.EnumSet;

@SuppressWarnings("unused")
public class SearchResultSequenceGenerator implements BeforeExecutionGenerator {

    @Override
    public Object generate(SharedSessionContractImplementor session, Object object, Object currentValue, EventType eventType)
            throws HibernateException {
        SearchResultEntity result = (SearchResultEntity) object;
        return SearchResultIdCalculator.calculateSearchResultId(result);
    }

    @Override
    public EnumSet<EventType> getEventTypes() {
        return EventTypeSets.INSERT_ONLY;
    }

}
