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
@Table(name = "issues")
class IssueEntity(
    @Id
    @Column(name = "issue_id", nullable = false)
    var id: String,

    @Column(name = "title", nullable = false)
    var title: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    var owner: UserEntity,

    @Column(name = "project_id")
    var projectId: String?,

    @Column(name = "status", nullable = false)
    var status: String,
) {
    @OneToMany(
        mappedBy = "issue",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    var phases: MutableList<PhaseEntity> = mutableListOf()
}
