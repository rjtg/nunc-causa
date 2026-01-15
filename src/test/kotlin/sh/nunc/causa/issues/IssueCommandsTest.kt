package sh.nunc.causa.issues

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class IssueCommandsTest {
    @Test
    fun `creates issue command`() {
        val command = CreateIssueCommand(
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            deadline = null,
            phases = listOf(CreatePhaseCommand(name = "Investigate", assigneeId = "user-1", kind = null, deadline = null)),
        )

        assertEquals("Issue", command.title)
        assertEquals("owner-1", command.ownerId)
        assertEquals("project-1", command.projectId)
        assertEquals(1, command.phases.size)
    }
}
