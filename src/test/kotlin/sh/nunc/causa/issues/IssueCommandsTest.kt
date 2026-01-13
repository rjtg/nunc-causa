package sh.nunc.causa.issues

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class IssueCommandsTest {
    @Test
    fun `creates issue command`() {
        val command = CreateIssueCommand(
            title = "Issue",
            owner = "owner-1",
            projectId = "project-1",
            phases = listOf(CreatePhaseCommand(name = "Investigate", assignee = "user-1")),
        )

        assertEquals("Issue", command.title)
        assertEquals("owner-1", command.owner)
        assertEquals("project-1", command.projectId)
        assertEquals(1, command.phases.size)
    }
}
