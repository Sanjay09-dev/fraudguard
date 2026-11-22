package com.fraudguard.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:backend-test")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
