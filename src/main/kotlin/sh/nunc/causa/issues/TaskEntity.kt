package sh.nunc.causa.issues

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.envers.Audited
import org.hibernate.envers.RelationTargetAuditMode
import sh.nunc.causa.users.UserEntity

@Entity
@Audited
@Table(name = "issue_tasks")
class TaskEntity(
    @Id
    @Column(name = "task_id", nullable = false)
    var id: String,

    @Column(name = "title", nullable = false)
    var title: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    var assignee: UserEntity?,

    @Column(name = "status", nullable = false)
    var status: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id", nullable = false)
    var phase: PhaseEntity,
) {
    @Column(name = "issue_id", nullable = false)
    var issueId: String = phase.issue.id
}
