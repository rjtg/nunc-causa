package sh.nunc.causa.tenancy

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "project_memberships")
class ProjectMembershipEntity(
    @Id
    @Column(name = "membership_id", nullable = false)
    var id: String,

    @Column(name = "project_id", nullable = false)
    var projectId: String,

    @Column(name = "user_id", nullable = false)
    var userId: String,
)
