package sh.nunc.causa.reporting

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.OffsetDateTime

@Entity
@Table(name = "issue_activity")
class IssueActivityEntity(
    @Id
    @Column(name = "activity_id", nullable = false)
    var id: String,

    @Column(name = "issue_id", nullable = false)
    var issueId: String,

    @Column(name = "type", nullable = false)
    var type: String,

    @Column(name = "summary", nullable = false)
    var summary: String,

    @Column(name = "actor_id")
    var actorId: String?,

    @Column(name = "occurred_at", nullable = false)
    var occurredAt: OffsetDateTime,
)
