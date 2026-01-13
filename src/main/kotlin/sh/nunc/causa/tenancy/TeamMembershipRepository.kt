package sh.nunc.causa.tenancy

import org.springframework.data.jpa.repository.JpaRepository

interface TeamMembershipRepository : JpaRepository<TeamMembershipEntity, String> {
    fun existsByUserIdAndTeamId(userId: String, teamId: String): Boolean
    fun existsByUserId(userId: String): Boolean
}
