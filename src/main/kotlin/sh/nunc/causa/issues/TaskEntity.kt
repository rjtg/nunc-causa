package sh.nunc.causa.issues

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.envers.Audited

@Entity
@Audited
@Table(name = "issue_tasks")
class TaskEntity(
    @Id
    @Column(name = "task_id", nullable = false)
    var id: String,

    @Column(name = "title", nullable = false)
    var title: String,

    @Column(name = "assignee")
    var assignee: String?,

    @Column(name = "status", nullable = false)
    var status: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id", nullable = false)
    var phase: PhaseEntity,
) {
    @Column(name = "issue_id", nullable = false)
    var issueId: String = phase.issue.id
}
