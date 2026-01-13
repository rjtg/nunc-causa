package sh.nunc.causa.web

import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

class CausaApplicationTest {
    @Test
    fun `application class instantiates`() {
        assertNotNull(CausaApplication())
    }
}
