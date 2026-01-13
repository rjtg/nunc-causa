package sh.nunc.causa.issues

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.users.UserEntity

class IssueEntitiesTest {
    @Test
    fun `task stores issue id from phase`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val assignee = UserEntity(id = "user-1", displayName = "Assignee")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            owner = owner,
            projectId = null,
            status = IssueStatus.CREATED.name,
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Investigation",
            assignee = assignee,
            status = PhaseStatus.NOT_STARTED.name,
            kind = null,
            issue = issue,
        )
        val task = TaskEntity(
            id = "task-1",
            title = "Check logs",
            assignee = assignee,
            status = TaskStatus.NOT_STARTED.name,
            phase = phase,
        )

        assertEquals("issue-1", task.issueId)
    }
}
