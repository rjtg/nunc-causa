package sh.nunc.causa.issues

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.LocalDate
import java.util.Optional
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.context.ApplicationEventPublisher
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

class IssueServiceTest {
    private val issueRepository = mockk<IssueRepository>()
    private val issueCounterRepository = mockk<IssueCounterRepository>()
    private val projectRepository = mockk<sh.nunc.causa.tenancy.ProjectRepository>()
    private val eventPublisher = mockk<ApplicationEventPublisher>(relaxed = true)
    private val userRepository = mockk<UserRepository>()
    private val historyService = mockk<IssueHistoryService>(relaxed = true)
    private val currentUserService = mockk<CurrentUserService>(relaxed = true)
    private val searchService = mockk<IssueSearchService>(relaxed = true)
    private val service = IssueService(
        issueRepository,
        issueCounterRepository,
        projectRepository,
        eventPublisher,
        userRepository,
        historyService,
        currentUserService,
        searchService,
    )

    @Test
    fun `creates issue with owner and phases`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val assignee = UserEntity(id = "user-2", displayName = "Assignee")
        every { userRepository.findById("owner-1") } returns Optional.of(owner)
        every { userRepository.findById("user-2") } returns Optional.of(assignee)
        every { projectRepository.findById("project-1") } returns Optional.of(
            sh.nunc.causa.tenancy.ProjectEntity(
                id = "project-1",
                key = "PROJ",
                orgId = "org-1",
                teamId = "team-1",
                name = "Project",
            ),
        )
        every { issueCounterRepository.findById("project-1") } returns Optional.empty()
        every { issueCounterRepository.save(any()) } answers { firstArg() }

        val savedSlot = slot<IssueEntity>()
        every { issueRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.createIssue(
            CreateIssueCommand(
                title = "Issue",
                description = "Issue description.",
                ownerId = "owner-1",
                projectId = "project-1",
                deadline = null,
                phases = listOf(
                    CreatePhaseCommand(
                        name = "Investigation",
                        assigneeId = "user-2",
                        kind = "INVESTIGATION",
                        deadline = null,
                    ),
                ),
            ),
        )

        assertEquals("Issue", result.title)
        assertEquals("owner-1", result.owner.id)
        assertEquals(1, result.phases.size)
        assertEquals("user-2", result.phases.first().assignee.id)
        val eventSlot = slot<Any>()
        verify { eventPublisher.publishEvent(capture(eventSlot)) }
        assertEquals(IssueUpdatedEvent(result.id), eventSlot.captured)
    }

    @Test
    fun `assigns new owner and publishes update`() {
        val currentOwner = UserEntity(id = "owner-1", displayName = "Owner")
        val newOwner = UserEntity(id = "owner-2", displayName = "New Owner")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            owner = currentOwner,
            projectId = null,
            status = IssueStatus.CREATED.name,
        )
        every { issueRepository.findById("issue-1") } returns Optional.of(issue)
        every { userRepository.findById("owner-2") } returns Optional.of(newOwner)
        every { issueRepository.save(issue) } returns issue

        val result = service.assignOwner("issue-1", "owner-2")

        assertEquals("owner-2", result.owner.id)
        val eventSlot = slot<Any>()
        verify { eventPublisher.publishEvent(capture(eventSlot)) }
        assertEquals(IssueUpdatedEvent("issue-1"), eventSlot.captured)
    }

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
        every { issueRepository.findById("issue-1") } returns Optional.of(issue)

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException::class.java) {
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
        every { issueRepository.findById("issue-2") } returns Optional.of(issue)

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException::class.java) {
            service.closeIssue("issue-2")
        }
    }

    @Test
    fun `rejects phase deadline beyond issue deadline`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-3",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = LocalDate.parse("2025-03-10"),
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.NOT_STARTED.name,
            kind = PhaseKind.INVESTIGATION.name,
            deadline = LocalDate.parse("2025-03-08"),
            issue = issue,
        )
        issue.phases.add(phase)
        every { issueRepository.findById("issue-3") } returns Optional.of(issue)

        assertThrows(IllegalStateException::class.java) {
            service.updatePhase(
                issueId = "issue-3",
                phaseId = "phase-1",
                name = null,
                assigneeId = null,
                status = null,
                completionComment = null,
                completionArtifactUrl = null,
                kind = null,
                deadline = LocalDate.parse("2025-03-15"),
            )
        }
    }

    @Test
    fun `rejects task due date beyond phase deadline`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-4",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = LocalDate.parse("2025-03-10"),
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.NOT_STARTED.name,
            kind = PhaseKind.INVESTIGATION.name,
            deadline = LocalDate.parse("2025-03-08"),
            issue = issue,
        )
        issue.phases.add(phase)
        every { issueRepository.findById("issue-4") } returns Optional.of(issue)

        assertThrows(IllegalStateException::class.java) {
            service.addTask(
                issueId = "issue-4",
                phaseId = "phase-1",
                title = "Prepare report",
                assigneeId = null,
                startDate = LocalDate.parse("2025-03-01"),
                dueDate = LocalDate.parse("2025-03-12"),
                dependencies = emptyList(),
            )
        }
    }

    @Test
    fun `clamps phase and task deadlines when issue deadline is reduced`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-5",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = LocalDate.parse("2025-03-20"),
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.IN_PROGRESS.name,
            kind = PhaseKind.INVESTIGATION.name,
            deadline = LocalDate.parse("2025-03-18"),
            issue = issue,
        )
        val task = TaskEntity(
            id = "task-1",
            title = "Prepare report",
            assignee = owner,
            status = TaskStatus.IN_PROGRESS.name,
            startDate = LocalDate.parse("2025-03-15"),
            dueDate = LocalDate.parse("2025-03-19"),
            phase = phase,
        )
        phase.tasks.add(task)
        issue.phases.add(phase)
        every { issueRepository.findById("issue-5") } returns Optional.of(issue)
        every { issueRepository.save(issue) } returns issue

        val updated = service.updateIssue(
            issueId = "issue-5",
            title = null,
            ownerId = null,
            projectId = null,
            description = null,
            deadline = LocalDate.parse("2025-03-16"),
        )

        assertEquals(LocalDate.parse("2025-03-16"), updated.deadline)
        assertEquals(LocalDate.parse("2025-03-16"), updated.phases.first().deadline)
        assertEquals(LocalDate.parse("2025-03-16"), updated.phases.first().tasks.first().dueDate)
        assertEquals(LocalDate.parse("2025-03-16"), updated.phases.first().tasks.first().startDate)
    }

    @Test
    fun `rejects task start date before dependency completion`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-6",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.IN_PROGRESS.name,
            kind = PhaseKind.INVESTIGATION.name,
            issue = issue,
        )
        val dependencyTask = TaskEntity(
            id = "task-1",
            title = "Collect data",
            assignee = owner,
            status = TaskStatus.IN_PROGRESS.name,
            startDate = LocalDate.parse("2025-03-01"),
            dueDate = LocalDate.parse("2025-03-10"),
            phase = phase,
        )
        val task = TaskEntity(
            id = "task-2",
            title = "Analyze data",
            assignee = owner,
            status = TaskStatus.NOT_STARTED.name,
            startDate = LocalDate.parse("2025-03-05"),
            dueDate = LocalDate.parse("2025-03-12"),
            phase = phase,
        )
        phase.tasks.addAll(listOf(dependencyTask, task))
        issue.phases.add(phase)
        every { issueRepository.findById("issue-6") } returns Optional.of(issue)

        assertThrows(IllegalStateException::class.java) {
            service.updateTask(
                issueId = "issue-6",
                phaseId = "phase-1",
                taskId = "task-2",
                title = null,
                assigneeId = null,
                status = null,
                startDate = LocalDate.parse("2025-03-05"),
                dueDate = LocalDate.parse("2025-03-12"),
                dependencies = listOf(
                    TaskDependencyView(type = TaskDependencyType.TASK.name, targetId = "task-1"),
                ),
            )
        }
    }
}
