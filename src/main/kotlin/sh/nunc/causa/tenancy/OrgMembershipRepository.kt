package sh.nunc.causa.tenancy

import org.springframework.data.jpa.repository.JpaRepository

interface OrgMembershipRepository : JpaRepository<OrgMembershipEntity, String> {
    fun existsByUserIdAndOrgId(userId: String, orgId: String): Boolean
    fun existsByUserId(userId: String): Boolean
}
