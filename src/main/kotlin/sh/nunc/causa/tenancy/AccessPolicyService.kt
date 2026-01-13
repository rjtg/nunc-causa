package sh.nunc.causa.tenancy

import org.springframework.stereotype.Service
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.users.CurrentUserService

@Service("accessPolicy")
class AccessPolicyService(
    private val currentUserService: CurrentUserService,
    private val projectMembershipRepository: ProjectMembershipRepository,
    private val issueRepository: IssueRepository,
) {
    fun canCreateIssue(projectId: String?): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        val resolvedProjectId = projectId ?: return false
        return projectMembershipRepository.existsByUserIdAndProjectId(userId, resolvedProjectId)
    }

    fun canViewIssue(issueId: String): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        val issue = issueRepository.findById(issueId).orElse(null) ?: return false
        val projectId = issue.projectId ?: return false
        return projectMembershipRepository.existsByUserIdAndProjectId(userId, projectId)
    }

    fun canModifyIssue(issueId: String): Boolean {
        return canViewIssue(issueId)
    }

    fun canListIssues(projectId: String?): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        return if (projectId == null) {
            projectMembershipRepository.existsByUserId(userId)
        } else {
            projectMembershipRepository.existsByUserIdAndProjectId(userId, projectId)
        }
    }

    fun canSearchIssues(projectId: String?): Boolean {
        return canListIssues(projectId)
    }

    fun canAccessWork(): Boolean {
        val userId = currentUserService.currentUserId() ?: return false
        return projectMembershipRepository.existsByUserId(userId)
    }

    fun isAuthenticated(): Boolean = currentUserService.currentUserId() != null

    fun currentUserId(): String? = currentUserService.currentUserId()
}
