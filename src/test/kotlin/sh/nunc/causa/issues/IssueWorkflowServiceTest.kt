package sh.nunc.causa.issues

import io.mockk.mockk
import java.util.Optional
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.context.ApplicationEventPublisher
import sh.nunc.causa.users.UserEntity

class IssueWorkflowServiceTest {
    private val issueRepository = mockk<IssueRepository>()
    private val eventPublisher = mockk<ApplicationEventPublisher>(relaxed = true)
    private val activityRecorder = mockk<IssueActivityRecorder>(relaxed = true)
    private val service = IssueWorkflowService(
        issueRepository,
        eventPublisher,
        activityRecorder,
    )

    @Test
    fun `rejects closing issue with incomplete phases`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
        )
        issue.phases.add(
            PhaseEntity(
                id = "phase-1",
                name = "Investigation",
                assignee = owner,
                status = PhaseStatus.IN_PROGRESS.name,
                kind = PhaseKind.INVESTIGATION.name,
                issue = issue,
            ),
        )
        io.mockk.every { issueRepository.findById("issue-1") } returns Optional.of(issue)

        assertThrows(IllegalStateException::class.java) {
            service.closeIssue("issue-1")
        }
    }

    @Test
    fun `rejects closing issue missing required phases`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-2",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
        )
        issue.phases.add(
            PhaseEntity(
                id = "phase-1",
                name = "Investigation",
                assignee = owner,
                status = PhaseStatus.DONE.name,
                kind = PhaseKind.INVESTIGATION.name,
                issue = issue,
            ),
        )
        io.mockk.every { issueRepository.findById("issue-2") } returns Optional.of(issue)

        assertThrows(IllegalStateException::class.java) {
            service.closeIssue("issue-2")
        }
    }

    @Test
    fun `derives issue status as not active when none in progress`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-7",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
        )
        val investigation = PhaseEntity(
            id = "phase-investigation",
            name = "Investigation",
            assignee = owner,
            status = PhaseStatus.DONE.name,
            kind = PhaseKind.INVESTIGATION.name,
            issue = issue,
        )
        val development = PhaseEntity(
            id = "phase-development",
            name = "Development",
            assignee = owner,
            status = PhaseStatus.NOT_STARTED.name,
            kind = PhaseKind.DEVELOPMENT.name,
            issue = issue,
        )
        issue.phases.addAll(listOf(investigation, development))

        val status = service.deriveIssueStatus(issue)

        assertEquals(IssueStatus.NOT_ACTIVE, status)
    }
}
