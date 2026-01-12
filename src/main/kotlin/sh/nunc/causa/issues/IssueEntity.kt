package sh.nunc.causa.issues

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import org.hibernate.envers.Audited

@Entity
@Audited
@Table(name = "issues")
class IssueEntity(
    @Id
    @Column(name = "issue_id", nullable = false)
    var id: String,

    @Column(name = "title", nullable = false)
    var title: String,

    @Column(name = "owner", nullable = false)
    var owner: String,

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
