package sh.nunc.causa.tenancy

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "projects")
class ProjectEntity(
    @Id
    @Column(name = "project_id", nullable = false)
    var id: String,

    @Column(name = "org_id", nullable = false)
    var orgId: String,

    @Column(name = "team_id", nullable = false)
    var teamId: String,

    @Column(name = "name", nullable = false)
    var name: String,
)
