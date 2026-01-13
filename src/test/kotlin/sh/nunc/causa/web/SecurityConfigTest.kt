package sh.nunc.causa.web

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.DefaultSecurityFilterChain

class SecurityConfigTest {
    @Test
    fun `builds security filter chain`() {
        val http = mockk<HttpSecurity>(relaxed = true)
        val chain = mockk<DefaultSecurityFilterChain>()
        every { http.build() } returns chain

        val config = SecurityConfig()
        val result = config.securityFilterChain(http)

        assertNotNull(result)
    }
}
