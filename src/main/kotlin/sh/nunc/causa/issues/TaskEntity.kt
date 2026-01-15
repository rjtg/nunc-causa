package sh.nunc.causa.issues

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
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.IndexingDependency
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.KeywordField
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.ObjectPath
import org.hibernate.search.mapper.pojo.mapping.definition.annotation.PropertyValue
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

    @Column(name = "start_date")
    var startDate: LocalDate? = null,

    @Column(name = "due_date")
    var dueDate: LocalDate? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id", nullable = false)
    var phase: PhaseEntity,
) {
    @get:Transient
    @get:KeywordField
    @get:IndexingDependency(derivedFrom = [ObjectPath(PropertyValue(propertyName = "assignee"))])
    val assigneeId: String?
        get() = assignee?.id

    @Column(name = "issue_id", nullable = false)
    var issueId: String = phase.issue.id

    @OneToMany(
        mappedBy = "task",
        cascade = [jakarta.persistence.CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    var dependencies: MutableList<TaskDependencyEntity> = mutableListOf()
}
