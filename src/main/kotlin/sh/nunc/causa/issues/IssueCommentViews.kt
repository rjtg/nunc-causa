package sh.nunc.causa.issues

import java.time.OffsetDateTime
import sh.nunc.causa.web.model.CommentResponse

data class IssueCommentsView(
    val comments: List<CommentResponse>,
    val unreadCount: Int,
    val lastReadAt: OffsetDateTime?,
    val latestCommentAt: OffsetDateTime?,
    val firstUnreadCommentId: String?,
)

data class CommentReadView(
    val lastReadAt: OffsetDateTime,
    val unreadCount: Int,
    val latestCommentAt: OffsetDateTime?,
)
