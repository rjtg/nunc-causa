package sh.nunc.causa.issues

import java.time.OffsetDateTime
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserRepository
import sh.nunc.causa.web.model.AddCommentRequest
import sh.nunc.causa.web.model.CommentResponse
import sh.nunc.causa.web.model.UserSummary

@Service
class IssueCommentService(
    private val commentRepository: IssueCommentRepository,
    private val currentUserService: CurrentUserService,
    private val commentReadRepository: IssueCommentReadRepository,
    private val issueService: IssueService,
    private val userRepository: UserRepository,
) {
    @Transactional(readOnly = true)
    fun listComments(issueId: String): IssueCommentsView {
        val comments = commentRepository.findAllByIssueIdOrderByCreatedAtAsc(issueId)
            .toList()
        val latest = commentRepository.findTopByIssueIdOrderByCreatedAtDesc(issueId)
        val relevantUsers = resolveRelevantUsers(issueId)
        val readMap = loadReadMap(issueId, relevantUsers.keys)
        val commentResponses = comments.map { comment ->
            val readBy = relevantUsers
                .filter { (userId) ->
                    val readAt = readMap[userId]
                    readAt != null && !readAt.isBefore(comment.createdAt)
                }
                .values
                .sortedBy { it.displayName }
            val unreadBy = relevantUsers
                .filterKeys { userId -> readBy.none { it.id == userId } }
                .values
                .sortedBy { it.displayName }
            comment.toResponse(readBy = readBy, unreadBy = unreadBy)
        }
        val userId = currentUserService.currentUserId()
        if (userId == null) {
            return IssueCommentsView(
                comments = commentResponses,
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
            comments = commentResponses,
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
        val saved = commentRepository.save(entity)
        val relevantUsers = resolveRelevantUsers(issueId)
        val readMap = loadReadMap(issueId, relevantUsers.keys)
        val readBy = relevantUsers
            .filter { (userId) ->
                val readAt = readMap[userId]
                readAt != null && !readAt.isBefore(saved.createdAt)
            }
            .values
            .sortedBy { it.displayName }
        val unreadBy = relevantUsers
            .filterKeys { userId -> readBy.none { it.id == userId } }
            .values
            .sortedBy { it.displayName }
        return saved.toResponse(readBy = readBy, unreadBy = unreadBy)
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

    private fun IssueCommentEntity.toResponse(
        readBy: List<UserSummary>,
        unreadBy: List<UserSummary>,
    ): CommentResponse {
        return CommentResponse(
            id = id,
            issueId = issueId,
            authorId = authorId,
            body = body,
            createdAt = createdAt,
            readByCount = readBy.size,
            unreadByCount = unreadBy.size,
            readByUsers = readBy,
            unreadByUsers = unreadBy,
        )
    }

    private fun resolveRelevantUsers(issueId: String): Map<String, UserSummary> {
        val issue = issueService.getIssueDetail(issueId)
        val userIds = mutableSetOf(issue.ownerId)
        issue.phases.forEach { phase ->
            userIds.add(phase.assigneeId)
            phase.tasks.mapNotNullTo(userIds) { it.assigneeId }
        }
        val users = userRepository.findAllById(userIds)
        return users.associate { user ->
            user.id to UserSummary(
                id = user.id,
                displayName = user.displayName,
                email = user.email,
            )
        }
    }

    private fun loadReadMap(issueId: String, userIds: Collection<String>): Map<String, OffsetDateTime> {
        if (userIds.isEmpty()) {
            return emptyMap()
        }
        return commentReadRepository.findAllByIssueIdAndUserIdIn(issueId, userIds)
            .associate { it.userId to it.lastReadAt }
    }
}
