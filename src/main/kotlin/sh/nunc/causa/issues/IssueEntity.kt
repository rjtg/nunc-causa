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
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.FullTextField
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.GenericField
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.Indexed
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.IndexedEmbedded
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.IndexingDependency
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.KeywordField
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.ObjectPath
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.PropertyValue
import org.hibernate.search.engine.backend.types.Aggregable
import org.hibernate.search.engine.backend.types.Sortable
import sh.nunc.causa.users.UserEntity

@Indexed
@Entity
@Audited
@Table(name = "issues")
class IssueEntity(
    @Id
    @Column(name = "issue_id", nullable = false)
    var id: String,

    @FullTextField(analyzer = "autocomplete", searchAnalyzer = "autocompleteSearch")
    @Column(name = "title", nullable = false)
    var title: String,

    @FullTextField(analyzer = "autocomplete", searchAnalyzer = "autocompleteSearch")
    @Column(name = "description", nullable = false)
    var description: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    var owner: UserEntity,

    @KeywordField(aggregable = Aggregable.YES)
    @Column(name = "project_id")
    var projectId: String?,

    @Column(name = "issue_number")
    var issueNumber: Long? = null,

    @KeywordField(aggregable = Aggregable.YES, sortable = Sortable.YES)
    @Column(name = "status", nullable = false)
    var status: String,

    @Column(name = "deadline")
    var deadline: LocalDate? = null,
) {
    @get:Transient
    @get:KeywordField(aggregable = Aggregable.YES)
    @get:IndexingDependency(derivedFrom = [ObjectPath(PropertyValue(propertyName = "owner"))])
    val ownerId: String
        get() = owner.id

    @OneToMany(
        mappedBy = "issue",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    @IndexedEmbedded(includePaths = ["assigneeId", "kind", "tasks.assigneeId"])
    var phases: MutableList<PhaseEntity> = mutableListOf()

    @get:Transient
    @get:GenericField
    @get:IndexingDependency(derivedFrom = [ObjectPath(PropertyValue(propertyName = "phases"))])
    val phaseCount: Int
        get() = phases.size
}
