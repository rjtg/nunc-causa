package sh.nunc.causa.web.issues

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseEntity
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskEntity
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.users.UserEntity

class IssueApiMapperTest {
    @Test
    fun `maps entity to response with user ids`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val assignee = UserEntity(id = "assignee-1", displayName = "Assignee")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
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
            status = TaskStatus.IN_PROGRESS.name,
            phase = phase,
        )
        phase.tasks.add(task)
        issue.phases.add(phase)

        val response = issue.toDetail()

        assertEquals("owner-1", response.ownerId)
        assertEquals("assignee-1", response.phases.first().assigneeId)
        assertEquals("assignee-1", response.phases.first().tasks.first().assigneeId)
    }

    @Test
    fun `maps issue summary status`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-2",
            title = "Issue",
            owner = owner,
            projectId = null,
            status = IssueStatus.DONE.name,
        )

        val summary = issue.toListItem()

        assertEquals("owner-1", summary.ownerId)
        assertEquals(sh.nunc.causa.web.model.IssueStatus.DONE, summary.status)
    }
}
