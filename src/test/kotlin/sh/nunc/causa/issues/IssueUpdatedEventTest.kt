package sh.nunc.causa.issues

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class IssueUpdatedEventTest {
    @Test
    fun `stores issue id`() {
        val event = IssueUpdatedEvent(issueId = "issue-1")

        assertEquals("issue-1", event.issueId)
    }
}
