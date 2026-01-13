package sh.nunc.causa.users

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.data.jpa.repository.JpaRepository

class UserRepositoryTest {
    @Test
    fun `user repository extends JpaRepository`() {
        assertTrue(JpaRepository::class.java.isAssignableFrom(UserRepository::class.java))
    }
}
