package sh.nunc.causa.tenancy

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "orgs")
class OrgEntity(
    @Id
    @Column(name = "org_id", nullable = false)
    var id: String,

    @Column(name = "name", nullable = false)
    var name: String,
)
