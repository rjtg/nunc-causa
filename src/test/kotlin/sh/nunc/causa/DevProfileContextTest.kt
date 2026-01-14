package sh.nunc.causa

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import sh.nunc.causa.web.CausaApplication

@SpringBootTest(classes = [CausaApplication::class], webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("dev")
class DevProfileContextTest {
    @Test
    fun `dev profile context loads`() {
        // Context initialization covers JPA, Envers mappings, and dev seeding.
    }
}
