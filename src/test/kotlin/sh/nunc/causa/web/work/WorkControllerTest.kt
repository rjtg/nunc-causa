package sh.nunc.causa.web.work

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueListView
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.MyWorkView
import sh.nunc.causa.issues.PhaseWorkView
import sh.nunc.causa.issues.TaskWorkView
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.web.model.PhaseStatus
import sh.nunc.causa.web.model.TaskStatus

class WorkControllerTest {
    @Test
    fun `returns work response from service`() {
        val issue = IssueListView(
            id = "issue-1",
            title = "Issue",
            ownerId = "owner-1",
            projectId = null,
            phaseCount = 0,
            status = IssueStatus.CREATED.name,
        )
        val work = MyWorkView(
            ownedIssues = listOf(issue),
            assignedPhases = listOf(
                PhaseWorkView(
                    issueId = "issue-1",
                    phaseId = "phase-1",
                    phaseName = "Investigation",
                    status = "IN_PROGRESS",
                ),
            ),
            assignedTasks = listOf(
                TaskWorkView(
                    issueId = "issue-1",
                    phaseId = "phase-1",
                    taskId = "task-1",
                    taskTitle = "Check logs",
                    status = "NOT_STARTED",
                ),
            ),
        )
        val service = mockk<IssueService>()
        every { service.buildMyWork("system") } returns work
        val currentUserService = mockk<CurrentUserService>()
        every { currentUserService.currentUserId() } returns "system"

        val controller = WorkController(service, currentUserService)
        val response = controller.getMyWork()

        assertEquals(1, response.body?.ownedIssues?.size)
        assertEquals(PhaseStatus.IN_PROGRESS, response.body?.assignedPhases?.first()?.status)
        assertEquals(TaskStatus.NOT_STARTED, response.body?.assignedTasks?.first()?.status)
    }
}
