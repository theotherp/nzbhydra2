

package org.nzbhydra.searching.db;

import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.enhanced.SequenceStyleGenerator;
import org.nzbhydra.searching.SearchResultIdCalculator;

import java.io.Serializable;

@SuppressWarnings("unused")
public class SearchResultSequenceGenerator extends SequenceStyleGenerator {

    @Override
    public Serializable generate(SharedSessionContractImplementor session, Object object) throws HibernateException {
        SearchResultEntity result = (SearchResultEntity) object;
        return SearchResultIdCalculator.calculateSearchResultId(result);
    }

}
