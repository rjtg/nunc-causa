package sh.nunc.causa.issues

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.util.Optional
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.context.ApplicationEventPublisher
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

class IssueServiceTest {
    private val issueRepository = mockk<IssueRepository>()
    private val eventPublisher = mockk<ApplicationEventPublisher>(relaxed = true)
    private val userRepository = mockk<UserRepository>()
    private val historyService = mockk<IssueHistoryService>(relaxed = true)
    private val currentUserService = mockk<CurrentUserService>(relaxed = true)
    private val searchService = mockk<IssueSearchService>(relaxed = true)
    private val service = IssueService(
        issueRepository,
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

        val savedSlot = slot<IssueEntity>()
        every { issueRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

        val result = service.createIssue(
            CreateIssueCommand(
                title = "Issue",
                description = "Issue description.",
                ownerId = "owner-1",
                projectId = "project-1",
                phases = listOf(
                    CreatePhaseCommand(name = "Investigation", assigneeId = "user-2", kind = "INVESTIGATION"),
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
}
