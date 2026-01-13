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
    private val eventPublisher = mockk<ApplicationEventPublisher>(relaxed = true)
    private val userRepository = mockk<UserRepository>()
    private val service = IssueService(issueRepository, eventPublisher, userRepository)

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
}
