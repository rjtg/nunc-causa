package sh.nunc.causa.issues

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.web.model.AddCommentRequest
import java.time.OffsetDateTime

class IssueCommentServiceTest {
    private val repository = mockk<IssueCommentRepository>()
    private val currentUserService = mockk<CurrentUserService>()
    private val readRepository = mockk<IssueCommentReadRepository>()
    private val service = IssueCommentService(repository, currentUserService, readRepository)

    @Test
    fun `adds comment with current user`() {
        every { currentUserService.currentUserId() } returns "user-1"
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

        val result = service.listComments("issue-1")

        assertEquals(1, result.comments.size)
        assertEquals("comment-1", result.comments.first().id)
    }
}
