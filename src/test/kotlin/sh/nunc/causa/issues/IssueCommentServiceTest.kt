package sh.nunc.causa.issues

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueDetailView
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository
import sh.nunc.causa.web.model.AddCommentRequest
import java.time.OffsetDateTime

class IssueCommentServiceTest {
    private val repository = mockk<IssueCommentRepository>()
    private val currentUserService = mockk<CurrentUserService>()
    private val readRepository = mockk<IssueCommentReadRepository>()
    private val issueService = mockk<IssueService>()
    private val userRepository = mockk<UserRepository>()
    private val service = IssueCommentService(
        repository,
        currentUserService,
        readRepository,
        issueService,
        userRepository,
    )

    @Test
    fun `adds comment with current user`() {
        every { currentUserService.currentUserId() } returns "user-1"
        every { issueService.getIssueDetail("issue-1") } returns IssueDetailView(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = null,
            phases = emptyList(),
        )
        every { userRepository.findAllById(any<Iterable<String>>()) } returns listOf(
            UserEntity(id = "owner-1", displayName = "Owner", email = null),
        )
        every { readRepository.findAllByIssueIdAndUserIdIn("issue-1", any()) } returns emptyList()
        every { repository.save(any()) } answers { it.invocation.args[0] as IssueCommentEntity }

        val result = service.addComment("issue-1", AddCommentRequest(body = "Hello", mentions = emptyList()))

        assertEquals("issue-1", result.issueId)
        assertEquals("user-1", result.authorId)
        assertEquals("Hello", result.body)
    }

    @Test
    fun `lists comments in order`() {
        val first = IssueCommentEntity(
            id = "comment-1",
            issueId = "issue-1",
            authorId = "user-1",
            body = "First",
            createdAt = OffsetDateTime.now(),
        )
        every { repository.findAllByIssueIdOrderByCreatedAtAsc("issue-1") } returns listOf(first)
        every { repository.findTopByIssueIdOrderByCreatedAtDesc("issue-1") } returns first
        every { currentUserService.currentUserId() } returns null
        every { issueService.getIssueDetail("issue-1") } returns IssueDetailView(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            ownerId = "owner-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = null,
            phases = emptyList(),
        )
        every { userRepository.findAllById(any<Iterable<String>>()) } returns listOf(
            UserEntity(id = "owner-1", displayName = "Owner", email = null),
        )
        every { readRepository.findAllByIssueIdAndUserIdIn("issue-1", any()) } returns emptyList()

        val result = service.listComments("issue-1")

        assertEquals(1, result.comments.size)
        assertEquals("comment-1", result.comments.first().id)
    }

    @Test
    fun `lists unread count using read marker`() {
        val now = OffsetDateTime.now()
        val latest = IssueCommentEntity(
            id = "comment-2",
            issueId = "issue-1",
            authorId = "user-1",
            body = "Latest",
            createdAt = now,
        )
        every { currentUserService.currentUserId() } returns "user-1"
        every { repository.findAllByIssueIdOrderByCreatedAtAsc("issue-1") } returns listOf(latest)
        every { repository.findTopByIssueIdOrderByCreatedAtDesc("issue-1") } returns latest
        every { issueService.getIssueDetail("issue-1") } returns IssueDetailView(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            ownerId = "user-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = null,
            phases = emptyList(),
        )
        every { userRepository.findAllById(any<Iterable<String>>()) } returns listOf(
            UserEntity(id = "user-1", displayName = "User One", email = null),
        )
        every { readRepository.findAllByIssueIdAndUserIdIn("issue-1", any()) } returns listOf(
            IssueCommentReadEntity(
                id = "read-1",
                issueId = "issue-1",
                userId = "user-1",
                lastReadAt = now.minusMinutes(5),
                lastReadCommentId = "comment-1",
            ),
        )
        every { readRepository.findByIssueIdAndUserId("issue-1", "user-1") } returns IssueCommentReadEntity(
            id = "read-1",
            issueId = "issue-1",
            userId = "user-1",
            lastReadAt = now.minusMinutes(5),
            lastReadCommentId = "comment-1",
        )
        every { repository.countByIssueIdAndCreatedAtAfter("issue-1", any()) } returns 1
        every {
            repository.findFirstByIssueIdAndCreatedAtAfterOrderByCreatedAtAsc("issue-1", any())
        } returns latest

        val result = service.listComments("issue-1")

        assertEquals(1, result.unreadCount)
        assertEquals("comment-2", result.firstUnreadCommentId)
    }

    @Test
    fun `marks comments read and stores last read id`() {
        val latest = IssueCommentEntity(
            id = "comment-2",
            issueId = "issue-1",
            authorId = "user-2",
            body = "Latest",
            createdAt = OffsetDateTime.now(),
        )
        every { currentUserService.currentUserId() } returns "user-1"
        every { repository.findTopByIssueIdOrderByCreatedAtDesc("issue-1") } returns latest
        every { issueService.getIssueDetail("issue-1") } returns IssueDetailView(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            ownerId = "user-1",
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = null,
            phases = emptyList(),
        )
        every { userRepository.findAllById(any<Iterable<String>>()) } returns listOf(
            UserEntity(id = "user-1", displayName = "User One", email = null),
        )
        every { readRepository.findAllByIssueIdAndUserIdIn("issue-1", any()) } returns emptyList()
        every { readRepository.findByIssueIdAndUserId("issue-1", "user-1") } returns null
        every { readRepository.save(any()) } answers { it.invocation.args[0] as IssueCommentReadEntity }

        val result = service.markRead("issue-1", "comment-2")

        assertEquals(0, result.unreadCount)
        verify {
            readRepository.save(
                withArg<IssueCommentReadEntity> {
                    assertEquals("issue-1", it.issueId)
                    assertEquals("user-1", it.userId)
                    assertEquals("comment-2", it.lastReadCommentId)
                },
            )
        }
    }
}
