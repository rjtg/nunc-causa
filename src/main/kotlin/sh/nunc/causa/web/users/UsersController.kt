package sh.nunc.causa.web.users

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus
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
    private val issueRepository: IssueRepository,
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
        val userIds = filteredUsers.map { it.id }.distinct()
        val workload = if (userIds.isEmpty()) {
            emptyMap()
        } else {
            val closedIssueStatuses = listOf(IssueStatus.DONE.name, IssueStatus.FAILED.name)
            val closedPhaseStatuses = listOf(PhaseStatus.DONE.name, PhaseStatus.FAILED.name)
            val closedTaskStatuses = listOf(TaskStatus.DONE.name, TaskStatus.ABANDONED.name)
            val issueCounts = issueRepository.findOwnerWorkload(
                userIds = userIds,
                projectId = null,
                closedStatuses = closedIssueStatuses,
            ).associate { it.userId to it.count }
            val phaseCounts = issueRepository.findPhaseWorkload(
                userIds = userIds,
                projectId = null,
                closedStatuses = closedPhaseStatuses,
            ).associate { it.userId to it.count }
            val taskCounts = issueRepository.findTaskWorkload(
                userIds = userIds,
                projectId = null,
                closedStatuses = closedTaskStatuses,
            ).associate { it.userId to it.count }
            userIds.associateWith { userId ->
                WorkloadSummary(
                    openIssueCount = issueCounts[userId] ?: 0,
                    openPhaseCount = phaseCounts[userId] ?: 0,
                    openTaskCount = taskCounts[userId] ?: 0,
                )
            }
        }

        return ResponseEntity.ok(
            filteredUsers
                .sortedBy { it.displayName.lowercase() }
                .map { user ->
                    val summary = workload[user.id] ?: WorkloadSummary(0, 0, 0)
                    UserSummary(
                        id = user.id,
                        displayName = user.displayName,
                        email = user.email,
                        openIssueCount = summary.openIssueCount,
                        openPhaseCount = summary.openPhaseCount,
                        openTaskCount = summary.openTaskCount,
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
    val openIssueCount: Long = 0,
    val openPhaseCount: Long = 0,
    val openTaskCount: Long = 0,
)

data class WorkloadSummary(
    val openIssueCount: Long,
    val openPhaseCount: Long,
    val openTaskCount: Long,
)
