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
    private val commentReadRepository: IssueCommentReadRepository,
) {
    @Transactional(readOnly = true)
    fun listComments(issueId: String): IssueCommentsView {
        val comments = commentRepository.findAllByIssueIdOrderByCreatedAtAsc(issueId)
            .map { it.toResponse() }
        val latest = commentRepository.findTopByIssueIdOrderByCreatedAtDesc(issueId)
        val userId = currentUserService.currentUserId()
        if (userId == null) {
            return IssueCommentsView(
                comments = comments,
                unreadCount = comments.size,
                lastReadAt = null,
                latestCommentAt = latest?.createdAt,
                firstUnreadCommentId = comments.firstOrNull()?.id,
            )
        }
        val read = commentReadRepository.findByIssueIdAndUserId(issueId, userId)
        val lastReadAt = read?.lastReadAt
        val unreadCount = if (lastReadAt == null) {
            comments.size
        } else {
            commentRepository.countByIssueIdAndCreatedAtAfter(issueId, lastReadAt).toInt()
        }
        val firstUnread = if (lastReadAt == null) {
            comments.firstOrNull()?.id
        } else {
            commentRepository.findFirstByIssueIdAndCreatedAtAfterOrderByCreatedAtAsc(issueId, lastReadAt)?.id
        }
        return IssueCommentsView(
            comments = comments,
            unreadCount = unreadCount,
            lastReadAt = lastReadAt,
            latestCommentAt = latest?.createdAt,
            firstUnreadCommentId = firstUnread,
        )
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

    @Transactional
    fun markRead(issueId: String, lastReadCommentId: String?): CommentReadView {
        val userId = currentUserService.currentUserId() ?: "system"
        val now = OffsetDateTime.now()
        val latest = commentRepository.findTopByIssueIdOrderByCreatedAtDesc(issueId)
        val resolvedCommentId = lastReadCommentId ?: latest?.id
        val readEntity = commentReadRepository.findByIssueIdAndUserId(issueId, userId)
            ?.let { existing ->
                existing.lastReadAt = now
                existing.lastReadCommentId = resolvedCommentId
                existing
            }
            ?: IssueCommentReadEntity(
                id = UUID.randomUUID().toString(),
                issueId = issueId,
                userId = userId,
                lastReadAt = now,
                lastReadCommentId = resolvedCommentId,
            )
        commentReadRepository.save(readEntity)
        return CommentReadView(
            lastReadAt = now,
            unreadCount = 0,
            latestCommentAt = latest?.createdAt,
        )
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
