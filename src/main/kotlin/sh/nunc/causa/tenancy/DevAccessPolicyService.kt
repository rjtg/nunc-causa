package sh.nunc.causa.tenancy

import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.users.CurrentUserService

@Service("accessPolicy")
@Profile("dev")
class DevAccessPolicyService(
    currentUserService: CurrentUserService,
    projectMembershipRepository: ProjectMembershipRepository,
    issueRepository: IssueRepository,
    projectRepository: ProjectRepository,
    teamRepository: TeamRepository,
    teamMembershipRepository: TeamMembershipRepository,
    orgMembershipRepository: OrgMembershipRepository,
) : AccessPolicyService(
    currentUserService,
    projectMembershipRepository,
    issueRepository,
    projectRepository,
    teamRepository,
    teamMembershipRepository,
    orgMembershipRepository,
) {
    override fun canCreateIssue(projectId: String?): Boolean = true
    override fun canViewIssue(issueId: String): Boolean = true
    override fun canModifyIssue(issueId: String): Boolean = true
    override fun canListIssues(projectId: String?): Boolean = true
    override fun canSearchIssues(projectId: String?): Boolean = true
    override fun canModifyProject(projectId: String): Boolean = true
    override fun canManageSearchIndex(): Boolean = true
    override fun canAccessWork(): Boolean = true
    override fun isAuthenticated(): Boolean = currentUserService.currentUserId() != null
}
