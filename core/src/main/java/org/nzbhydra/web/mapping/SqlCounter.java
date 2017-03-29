package org.nzbhydra.web.mapping;

import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.Id;
import java.math.BigDecimal;

@Data
@Entity
public class SqlCounter {

    @Id
    private int indexerid;
    private BigDecimal counter;

}
