package sh.nunc.causa.issues

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "issue_counters")
class IssueCounterEntity(
    @Id
    @Column(name = "project_id", nullable = false)
    var projectId: String,

    @Column(name = "next_number", nullable = false)
    var nextNumber: Long,
)
