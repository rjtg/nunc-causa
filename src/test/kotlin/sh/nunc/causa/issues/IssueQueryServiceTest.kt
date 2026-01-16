package sh.nunc.causa.issues

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.users.UserEntity

class IssueQueryServiceTest {
    private val issueRepository = mockk<IssueRepository>()
    private val searchService = mockk<IssueSearchService>()
    private val service = IssueQueryService(issueRepository, searchService)

    @Test
    fun `list issues maps phase progress and status counts`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val assignee = UserEntity(id = "user-2", displayName = "Assignee")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Investigation",
            assignee = assignee,
            status = PhaseStatus.IN_PROGRESS.name,
            kind = PhaseKind.INVESTIGATION.name,
            issue = issue,
        )
        val task = TaskEntity(
            id = "task-1",
            title = "Check logs",
            assignee = assignee,
            status = TaskStatus.NOT_STARTED.name,
            phase = phase,
        )
        phase.tasks.add(task)
        issue.phases.add(phase)
        every { searchService.searchIssues(any(), any()) } returns listOf(issue)

        val results = service.listIssues(
            query = null,
            ownerId = null,
            assigneeId = null,
            memberId = null,
            projectId = null,
            status = null,
            phaseKind = null,
        )

        assertEquals(1, results.size)
        val result = results.first()
        assertEquals(1, result.phaseStatusCounts[PhaseStatus.IN_PROGRESS.name])
        assertEquals(1, result.phaseProgress.size)
        assertEquals(1, result.phaseProgress.first().taskTotal)
    }
}
