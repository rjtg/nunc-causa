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
@Table(name = "issue_task_dependencies")
class TaskDependencyEntity(
    @Id
    @Column(name = "dependency_id", nullable = false)
    var id: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    var task: TaskEntity,

    @Column(name = "dependency_type", nullable = false)
    var type: String,

    @Column(name = "dependency_target_id", nullable = false)
    var targetId: String,
)
