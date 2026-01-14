package sh.nunc.causa.issues

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import org.hibernate.envers.Audited
import org.hibernate.envers.RelationTargetAuditMode
import sh.nunc.causa.users.UserEntity

@Entity
@Audited
@Table(name = "issue_phases")
class PhaseEntity(
    @Id
    @Column(name = "phase_id", nullable = false)
    var id: String,

    @Column(name = "name", nullable = false)
    var name: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id", nullable = false)
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    var assignee: UserEntity,

    @Column(name = "status", nullable = false)
    var status: String,

    @Column(name = "kind")
    var kind: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    var issue: IssueEntity,
) {
    @OneToMany(
        mappedBy = "phase",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    var tasks: MutableList<TaskEntity> = mutableListOf()
}
