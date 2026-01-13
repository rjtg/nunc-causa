package sh.nunc.causa.issues

import java.time.OffsetDateTime
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.web.model.AddCommentRequest
import sh.nunc.causa.web.model.CommentResponse

@Service
class IssueCommentService(
    private val commentRepository: IssueCommentRepository,
    private val currentUserService: CurrentUserService,
) {
    @Transactional(readOnly = true)
    fun listComments(issueId: String): List<CommentResponse> {
        return commentRepository.findAllByIssueIdOrderByCreatedAtAsc(issueId)
            .map { it.toResponse() }
    }

    @Transactional
    fun addComment(issueId: String, request: AddCommentRequest): CommentResponse {
        val authorId = currentUserService.currentUserId() ?: "system"
        val entity = IssueCommentEntity(
            id = UUID.randomUUID().toString(),
            issueId = issueId,
            authorId = authorId,
            body = request.body,
            createdAt = OffsetDateTime.now(),
        )
        return commentRepository.save(entity).toResponse()
    }

    private fun IssueCommentEntity.toResponse(): CommentResponse {
        return CommentResponse(
            id = id,
            issueId = issueId,
            authorId = authorId,
            body = body,
            createdAt = createdAt,
        )
    }
}
