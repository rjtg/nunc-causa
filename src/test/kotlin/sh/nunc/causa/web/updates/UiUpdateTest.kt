package sh.nunc.causa.web.updates

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class UiUpdateTest {
    @Test
    fun `stores update payload`() {
        val update = UiUpdate(type = "ISSUE_UPDATED", issueId = "issue-1")

        assertEquals("ISSUE_UPDATED", update.type)
        assertEquals("issue-1", update.issueId)
    }
}
