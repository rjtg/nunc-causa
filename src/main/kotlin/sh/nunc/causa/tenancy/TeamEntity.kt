package sh.nunc.causa.tenancy

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "teams")
class TeamEntity(
    @Id
    @Column(name = "team_id", nullable = false)
    var id: String,

    @Column(name = "org_id", nullable = false)
    var orgId: String,

    @Column(name = "parent_team_id")
    var parentTeamId: String?,

    @Column(name = "name", nullable = false)
    var name: String,
)
