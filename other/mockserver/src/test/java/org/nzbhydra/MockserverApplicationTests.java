package org.nzbhydra;

import org.junit.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.mockserver.MockserverApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = MockserverApplication.class)
public class MockserverApplicationTests {

    @Test
    public void contextLoads() {
    }

}
