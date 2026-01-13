package sh.nunc.causa.tenancy

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "team_memberships")
class TeamMembershipEntity(
    @Id
    @Column(name = "membership_id", nullable = false)
    var id: String,

    @Column(name = "team_id", nullable = false)
    var teamId: String,

    @Column(name = "user_id", nullable = false)
    var userId: String,
)
