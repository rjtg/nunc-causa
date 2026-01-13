package sh.nunc.causa.issues

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "issue_comments")
class IssueCommentEntity(
    @Id
    @Column(name = "comment_id", nullable = false)
    var id: String,

    @Column(name = "issue_id", nullable = false)
    var issueId: String,

    @Column(name = "author_id", nullable = false)
    var authorId: String,

    @Column(name = "body", nullable = false)
    var body: String,

    @Column(name = "created_at", nullable = false)
    var createdAt: OffsetDateTime,
)
