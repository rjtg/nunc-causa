package sh.nunc.causa.users

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class UserEntityTest {
    @Test
    fun `stores user fields`() {
        val user = UserEntity(id = "user-1", displayName = "User", email = "user@example.com")

        assertEquals("user-1", user.id)
        assertEquals("User", user.displayName)
        assertEquals("user@example.com", user.email)
    }
}
