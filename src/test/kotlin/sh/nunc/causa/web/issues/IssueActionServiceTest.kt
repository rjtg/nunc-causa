package sh.nunc.causa.web.issues

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueDetailView
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseView
import sh.nunc.causa.issues.TaskView
import sh.nunc.causa.tenancy.AccessPolicyService

class IssueActionServiceTest {
    private val accessPolicy = mockk<AccessPolicyService>()
    private val service = IssueActionService(accessPolicy)

    @Test
    fun `allows closing issues when phases done`() {
        val issue = IssueDetailView(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.DONE.name,
            phases = listOf(
                PhaseView(
                    id = "phase-1",
                    name = "Analysis",
                    assigneeId = "assignee-1",
                    status = "DONE",
                    kind = "INVESTIGATION",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = emptyList(),
                ),
                PhaseView(
                    id = "phase-2",
                    name = "Development",
                    assigneeId = "assignee-1",
                    status = "DONE",
                    kind = "DEVELOPMENT",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = emptyList(),
                ),
                PhaseView(
                    id = "phase-3",
                    name = "Test",
                    assigneeId = "assignee-1",
                    status = "DONE",
                    kind = "ACCEPTANCE_TEST",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = emptyList(),
                ),
                PhaseView(
                    id = "phase-4",
                    name = "Rollout",
                    assigneeId = "assignee-1",
                    status = "DONE",
                    kind = "ROLLOUT",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = emptyList(),
                ),
            ),
        )
        every { accessPolicy.canModifyIssue("issue-1") } returns true

        val actions = service.issueActions(issue)

        assertTrue(actions.getValue("CLOSE_ISSUE").allowed)
    }

    @Test
    fun `rejects closing issues with unfinished phases`() {
        val issue = IssueDetailView(
            id = "issue-2",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            phases = listOf(
                PhaseView(
                    id = "phase-1",
                    name = "Analysis",
                    assigneeId = "assignee-1",
                    status = "IN_PROGRESS",
                    kind = "INVESTIGATION",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = emptyList(),
                ),
            ),
        )
        every { accessPolicy.canModifyIssue("issue-2") } returns true

        val actions = service.issueActions(issue)

        assertFalse(actions.getValue("CLOSE_ISSUE").allowed)
    }

    @Test
    fun `rejects closing issues missing required phases`() {
        val issue = IssueDetailView(
            id = "issue-3",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            phases = listOf(
                PhaseView(
                    id = "phase-1",
                    name = "Analysis",
                    assigneeId = "assignee-1",
                    status = "DONE",
                    kind = "INVESTIGATION",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = emptyList(),
                ),
            ),
        )
        every { accessPolicy.canModifyIssue("issue-3") } returns true

        val actions = service.issueActions(issue)

        assertFalse(actions.getValue("CLOSE_ISSUE").allowed)
    }

    @Test
    fun `blocks marking phases done when tasks are open`() {
        val issue = IssueDetailView(
            id = "issue-3",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_DEVELOPMENT.name,
            phases = listOf(
                PhaseView(
                    id = "phase-1",
                    name = "Development",
                    assigneeId = "assignee-1",
                    status = "IN_PROGRESS",
                    kind = "DEVELOPMENT",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = listOf(
                        TaskView(
                            id = "task-1",
                            title = "Implement",
                            assigneeId = "assignee-1",
                            status = "IN_PROGRESS",
                        ),
                    ),
                ),
            ),
        )
        every { accessPolicy.canModifyIssue("issue-3") } returns true

        val actions = service.phaseActions(issue, "phase-1")

        assertFalse(actions.getValue("MARK_DONE").allowed)
    }

    @Test
    fun `allows marking tasks done when permitted`() {
        val issue = IssueDetailView(
            id = "issue-5",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_DEVELOPMENT.name,
            phases = listOf(
                PhaseView(
                    id = "phase-1",
                    name = "Development",
                    assigneeId = "assignee-1",
                    status = "IN_PROGRESS",
                    kind = "DEVELOPMENT",
                    completionComment = null,
                    completionArtifactUrl = null,
                    tasks = listOf(
                        TaskView(
                            id = "task-1",
                            title = "Implement",
                            assigneeId = "assignee-1",
                            status = "NOT_STARTED",
                        ),
                    ),
                ),
            ),
        )
        every { accessPolicy.canModifyIssue("issue-5") } returns true

        val actions = service.taskActions(issue, "phase-1", "task-1")

        assertTrue(actions.getValue("MARK_DONE").allowed)
    }
}
