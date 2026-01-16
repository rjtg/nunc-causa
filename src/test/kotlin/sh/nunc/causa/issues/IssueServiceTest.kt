package sh.nunc.causa.issues

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.util.Optional
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.context.ApplicationEventPublisher
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

class IssueServiceTest {
    private val issueRepository = mockk<IssueRepository>()
    private val issueCounterRepository = mockk<IssueCounterRepository>()
    private val projectRepository = mockk<sh.nunc.causa.tenancy.ProjectRepository>()
    private val eventPublisher = mockk<ApplicationEventPublisher>(relaxed = true)
    private val userRepository = mockk<UserRepository>()
    private val activityRecorder = mockk<IssueActivityRecorder>(relaxed = true)
    private val deadlineService = mockk<IssueDeadlineService>(relaxed = true)
    private val workflowService = mockk<IssueWorkflowService>(relaxed = true)
    private val service = IssueService(
        issueRepository,
        issueCounterRepository,
        projectRepository,
        userRepository,
        eventPublisher,
        activityRecorder,
        deadlineService,
        workflowService,
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
                ownerId = null,
                name = "Project",
            ),
        )
        every { issueCounterRepository.findById("project-1") } returns Optional.empty()
        every { issueCounterRepository.save(any()) } answers { firstArg() }
        every { workflowService.deriveIssueStatus(any()) } returns IssueStatus.CREATED

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
    fun `creates issue with default development phase when none provided`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        every { userRepository.findById("owner-1") } returns Optional.of(owner)
        every { projectRepository.findById("project-1") } returns Optional.of(
            sh.nunc.causa.tenancy.ProjectEntity(
                id = "project-1",
                key = "PROJ",
                orgId = "org-1",
                teamId = "team-1",
                ownerId = null,
                name = "Project",
            ),
        )
        every { issueCounterRepository.findById("project-1") } returns Optional.empty()
        every { issueCounterRepository.save(any()) } answers { firstArg() }
        every { workflowService.deriveIssueStatus(any()) } returns IssueStatus.CREATED

        val savedSlot = slot<IssueEntity>()
        every { issueRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.createIssue(
            CreateIssueCommand(
                title = "Issue",
                description = "Issue description.",
                ownerId = "owner-1",
                projectId = "project-1",
                deadline = null,
                phases = emptyList(),
            ),
        )

        assertEquals(1, result.phases.size)
        val phase = result.phases.first()
        assertEquals("Development", phase.name)
        assertEquals("DEVELOPMENT", phase.kind)
        assertEquals("owner-1", phase.assignee.id)
    }

    @Test
    fun `records dependency activity for source and target issues`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val assignee = UserEntity(id = "user-1", displayName = "Assignee")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = null,
            status = IssueStatus.CREATED.name,
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Phase",
            assignee = assignee,
            status = PhaseStatus.NOT_STARTED.name,
            kind = null,
            issue = issue,
        )
        val task = TaskEntity(
            id = "task-1",
            title = "Task",
            assignee = assignee,
            status = TaskStatus.NOT_STARTED.name,
            phase = phase,
        )
        phase.tasks.add(task)
        issue.phases.add(phase)

        every { issueRepository.findById("issue-1") } returns Optional.of(issue)
        every { issueRepository.save(issue) } returns issue
        every { workflowService.deriveIssueStatus(issue) } returns IssueStatus.CREATED

        service.updateTask(
            issueId = "issue-1",
            phaseId = "phase-1",
            taskId = "task-1",
            title = null,
            assigneeId = null,
            status = null,
            startDate = null,
            dueDate = null,
            dependencies = listOf(
                TaskDependencyView(type = TaskDependencyType.ISSUE.name, targetId = "issue-2"),
            ),
        )

        val sourceSummary = slot<String>()
        val targetSummary = slot<String>()
        verify {
            activityRecorder.record("issue-1", "DEPENDENCY_ADDED", capture(sourceSummary))
        }
        verify {
            activityRecorder.record("issue-2", "DEPENDENCY_ADDED", capture(targetSummary))
        }
        assertEquals(true, sourceSummary.captured.contains("issue-1"))
        assertEquals(true, sourceSummary.captured.contains("ISSUE:issue-2"))
        assertEquals(true, targetSummary.captured.contains("issue-1"))
        assertEquals(true, targetSummary.captured.contains("ISSUE:issue-2"))
    }
}
