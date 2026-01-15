package sh.nunc.causa.web.users

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.tenancy.OrgMembershipRepository
import sh.nunc.causa.tenancy.ProjectMembershipRepository
import sh.nunc.causa.tenancy.AccessPolicyService
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

@RestController
class UsersController(
    private val userRepository: UserRepository,
    private val currentUserService: CurrentUserService,
    private val orgMembershipRepository: OrgMembershipRepository,
    private val projectMembershipRepository: ProjectMembershipRepository,
    private val accessPolicy: AccessPolicyService,
) {
    @PreAuthorize("@accessPolicy.canListIssues(null)")
    @GetMapping("/users")
    fun listUsers(
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) projectId: String?,
    ): ResponseEntity<List<UserSummary>> {
        if (!projectId.isNullOrBlank() && !accessPolicy.canListIssues(projectId)) {
            return ResponseEntity.ok(emptyList())
        }
        val users = when {
            !projectId.isNullOrBlank() -> usersForProject(projectId)
            else -> usersForCurrentOrg()
        }
        val filteredUsers = if (q.isNullOrBlank()) {
            users
        } else {
            val query = q.lowercase()
            users.filter { user ->
                user.displayName.lowercase().contains(query) || user.id.lowercase().contains(query)
            }
        }
        return ResponseEntity.ok(
            filteredUsers
                .sortedBy { it.displayName.lowercase() }
                .map { user ->
                UserSummary(
                    id = user.id,
                    displayName = user.displayName,
                    email = user.email,
                )
            },
        )
    }

    private fun usersForProject(projectId: String) =
        projectMembershipRepository.findAllByProjectId(projectId)
            .map { it.userId }
            .distinct()
            .let { userRepository.findAllById(it) }

    private fun usersForCurrentOrg(): List<UserEntity> {
        val userId = currentUserService.currentUserId() ?: return emptyList()
        val orgIds = orgMembershipRepository.findAllByUserId(userId)
            .map { it.orgId }
            .distinct()
        if (orgIds.isEmpty()) {
            return emptyList()
        }
        val memberIds = orgMembershipRepository.findAllByOrgIdIn(orgIds)
            .map { it.userId }
            .distinct()
        return userRepository.findAllById(memberIds)
    }
}

data class UserSummary(
    val id: String,
    val displayName: String,
    val email: String?,
)
