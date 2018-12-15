package org.nzbhydra;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mockserver.MockserverApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = MockserverApplication.class)
public class MockserverApplicationTests {

    @Test
    public void contextLoads() {
    }

}
