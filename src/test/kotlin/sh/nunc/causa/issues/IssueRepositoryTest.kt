package sh.nunc.causa.issues

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.data.jpa.repository.JpaRepository

class IssueRepositoryTest {
    @Test
    fun `issue repository extends JpaRepository`() {
        assertTrue(JpaRepository::class.java.isAssignableFrom(IssueRepository::class.java))
    }
}
