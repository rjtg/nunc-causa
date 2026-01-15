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
import jakarta.persistence.Transient
import java.time.LocalDate
import org.hibernate.envers.Audited
import org.hibernate.envers.RelationTargetAuditMode
import org.hibernate.search.engine.backend.types.Aggregable
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.IndexedEmbedded
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.IndexingDependency
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.KeywordField
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.ObjectPath
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.PropertyValue
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

    @Column(name = "completion_comment")
    var completionComment: String? = null,

    @Column(name = "completion_artifact_url")
    var completionArtifactUrl: String? = null,

    @KeywordField(aggregable = Aggregable.YES)
    @Column(name = "kind")
    var kind: String?,

    @Column(name = "deadline")
    var deadline: LocalDate? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    var issue: IssueEntity,
) {
    @get:Transient
    @get:KeywordField(aggregable = Aggregable.YES)
    @get:IndexingDependency(derivedFrom = [ObjectPath(PropertyValue(propertyName = "assignee"))])
    val assigneeId: String
        get() = assignee.id

    @OneToMany(
        mappedBy = "phase",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    @IndexedEmbedded(includePaths = ["assigneeId"])
    var tasks: MutableList<TaskEntity> = mutableListOf()
}
