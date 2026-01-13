package sh.nunc.causa.tenancy

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "org_memberships")
class OrgMembershipEntity(
    @Id
    @Column(name = "membership_id", nullable = false)
    var id: String,

    @Column(name = "org_id", nullable = false)
    var orgId: String,

    @Column(name = "user_id", nullable = false)
    var userId: String,
)
