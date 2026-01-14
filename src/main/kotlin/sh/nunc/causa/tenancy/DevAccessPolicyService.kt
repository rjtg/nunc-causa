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
    private fun isSignedIn(): Boolean {
        return currentUserService.currentUserId() != null
    }

    override fun canCreateIssue(projectId: String?): Boolean = isSignedIn()
    override fun canViewIssue(issueId: String): Boolean = isSignedIn()
    override fun canModifyIssue(issueId: String): Boolean = isSignedIn()
    override fun canListIssues(projectId: String?): Boolean = isSignedIn()
    override fun canSearchIssues(projectId: String?): Boolean = isSignedIn()
    override fun canAccessWork(): Boolean = isSignedIn()
    override fun isAuthenticated(): Boolean = isSignedIn()
}
