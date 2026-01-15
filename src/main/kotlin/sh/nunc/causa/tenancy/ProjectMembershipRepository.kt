package sh.nunc.causa.tenancy

import org.springframework.data.jpa.repository.JpaRepository

interface ProjectMembershipRepository : JpaRepository<ProjectMembershipEntity, String> {
    fun existsByUserIdAndProjectId(userId: String, projectId: String): Boolean
    fun existsByUserId(userId: String): Boolean
    fun findAllByProjectId(projectId: String): List<ProjectMembershipEntity>
    fun findAllByUserId(userId: String): List<ProjectMembershipEntity>
}
