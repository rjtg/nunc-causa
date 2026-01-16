package sh.nunc.causa.tenancy

import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.users.CurrentUserService

@Service("accessPolicy")
@Profile("!dev")
open class AccessPolicyService(
    protected val currentUserService: CurrentUserService,
    private val projectMembershipRepository: ProjectMembershipRepository,
    private val issueRepository: IssueRepository,
    private val projectRepository: ProjectRepository,
    private val teamRepository: TeamRepository,
    private val teamMembershipRepository: TeamMembershipRepository,
    private val orgMembershipRepository: OrgMembershipRepository,
) {
    open fun canCreateIssue(projectId: String?): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        val resolvedProjectId = projectId ?: return false
        return canAccessProject(userId, resolvedProjectId)
    }

    open fun canViewIssue(issueId: String): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        val issue = issueRepository.findById(issueId).orElse(null) ?: return false
        val projectId = issue.projectId ?: return false
        return canAccessProject(userId, projectId)
    }

    open fun canModifyIssue(issueId: String): Boolean {
        return canViewIssue(issueId)
    }

    open fun canListIssues(projectId: String?): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        return if (projectId == null) {
            hasAnyMembership(userId)
        } else {
            canAccessProject(userId, projectId)
        }
    }

    open fun canSearchIssues(projectId: String?): Boolean {
        return canListIssues(projectId)
    }

    open fun canModifyProject(projectId: String): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        return canAccessProject(userId, projectId)
    }

    open fun canManageSearchIndex(): Boolean {
        return isAuthenticated()
    }

    open fun canAccessWork(): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        return hasAnyMembership(userId)
    }

    open fun isAuthenticated(): Boolean = currentUserService.currentUserId() != null

    open fun currentUserId(): String? = currentUserService.currentUserId()

    private fun canAccessProject(userId: String, projectId: String): Boolean {
        if (projectMembershipRepository.existsByUserIdAndProjectId(userId, projectId)) {
            return true
        }
        val project = projectRepository.findById(projectId).orElse(null) ?: return false
        if (orgMembershipRepository.existsByUserIdAndOrgId(userId, project.orgId)) {
            return true
        }
        return isMemberOfTeamHierarchy(userId, project.teamId)
    }

    private fun isMemberOfTeamHierarchy(userId: String, teamId: String): Boolean {
        var currentTeamId: String? = teamId
        val visited = mutableSetOf<String>()
        while (currentTeamId != null && visited.add(currentTeamId)) {
            if (teamMembershipRepository.existsByUserIdAndTeamId(userId, currentTeamId)) {
                return true
            }
            val team = teamRepository.findById(currentTeamId).orElse(null) ?: return false
            currentTeamId = team.parentTeamId
        }
        return false
    }

    private fun hasAnyMembership(userId: String): Boolean {
        return projectMembershipRepository.existsByUserId(userId)
            || teamMembershipRepository.existsByUserId(userId)
            || orgMembershipRepository.existsByUserId(userId)
    }
}
