package sh.nunc.causa.web.issues

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueDetailView
import sh.nunc.causa.issues.IssueListView
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseView
import sh.nunc.causa.issues.TaskView
import sh.nunc.causa.web.model.ActionDecision

class IssueApiMapperTest {
    @Test
    fun `maps entity to response with user ids`() {
        val issue = IssueDetailView(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = null,
            phases = listOf(
                PhaseView(
                    id = "phase-1",
                    name = "Investigation",
                    assigneeId = "assignee-1",
                    status = "NOT_STARTED",
                    kind = null,
                    completionComment = null,
                    completionArtifactUrl = null,
                    deadline = null,
                    tasks = listOf(
                        TaskView(
                            id = "task-1",
                            title = "Check logs",
                            assigneeId = "assignee-1",
                            status = "IN_PROGRESS",
                            startDate = null,
                            dueDate = null,
                            dependencies = emptyList(),
                        ),
                    ),
                ),
            ),
        )
        val response = issue.toDetail(object : IssueActionProvider {
            override fun issueActions(issue: IssueDetailView): Map<String, ActionDecision> = emptyMap()
            override fun phaseActions(issue: IssueDetailView, phaseId: String): Map<String, ActionDecision> = emptyMap()
            override fun taskActions(issue: IssueDetailView, phaseId: String, taskId: String): Map<String, ActionDecision> = emptyMap()
        })

        assertEquals("owner-1", response.ownerId)
        assertEquals("assignee-1", response.phases.first().assigneeId)
        assertEquals("assignee-1", response.phases.first().tasks.first().assigneeId)
    }

    @Test
    fun `maps issue summary status`() {
        val issue = IssueListView(
            id = "issue-2",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = null,
            phaseCount = 2,
            status = IssueStatus.DONE.name,
            deadline = null,
        )

        val summary = issue.toListItem()

        assertEquals("owner-1", summary.ownerId)
        assertEquals(sh.nunc.causa.web.model.IssueStatus.DONE, summary.status)
    }
}
