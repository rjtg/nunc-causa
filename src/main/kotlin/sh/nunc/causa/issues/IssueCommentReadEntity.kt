package sh.nunc.causa.issues

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "issue_comment_reads")
class IssueCommentReadEntity(
    @Id
    @Column(name = "read_id", nullable = false)
    var id: String,

    @Column(name = "issue_id", nullable = false)
    var issueId: String,

    @Column(name = "user_id", nullable = false)
    var userId: String,

    @Column(name = "last_read_at", nullable = false)
    var lastReadAt: OffsetDateTime,

    @Column(name = "last_read_comment_id")
    var lastReadCommentId: String? = null,
)
