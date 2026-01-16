package sh.nunc.causa.tenancy

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.tenancy.ProjectEntity
import sh.nunc.causa.tenancy.TeamEntity
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import java.util.Optional

class AccessPolicyServiceTest {
    private val currentUserService = mockk<CurrentUserService>()
    private val membershipRepository = mockk<ProjectMembershipRepository>()
    private val issueRepository = mockk<IssueRepository>()
    private val projectRepository = mockk<ProjectRepository>()
    private val teamRepository = mockk<TeamRepository>()
    private val teamMembershipRepository = mockk<TeamMembershipRepository>()
    private val orgMembershipRepository = mockk<OrgMembershipRepository>()
    private val policy = AccessPolicyService(
        currentUserService,
        membershipRepository,
        issueRepository,
        projectRepository,
        teamRepository,
        teamMembershipRepository,
        orgMembershipRepository,
    )

    @Test
    fun `denies create when user not authenticated`() {
        every { currentUserService.currentUserId() } returns null

        assertFalse(policy.canCreateIssue("project-1"))
    }

    @Test
    fun `allows create when user is project member`() {
        every { currentUserService.currentUserId() } returns "user-1"
        every { membershipRepository.existsByUserIdAndProjectId("user-1", "project-1") } returns true

        assertTrue(policy.canCreateIssue("project-1"))
    }

    @Test
    fun `allows create when user is org member`() {
        val project = ProjectEntity(
            id = "project-1",
            key = "PROJ",
            orgId = "org-1",
            teamId = "team-1",
            ownerId = null,
            name = "Project",
        )
        every { currentUserService.currentUserId() } returns "user-1"
        every { membershipRepository.existsByUserIdAndProjectId("user-1", "project-1") } returns false
        every { projectRepository.findById("project-1") } returns Optional.of(project)
        every { orgMembershipRepository.existsByUserIdAndOrgId("user-1", "org-1") } returns true

        assertTrue(policy.canCreateIssue("project-1"))
    }

    @Test
    fun `allows create when user is ancestor team member`() {
        val project = ProjectEntity(
            id = "project-1",
            key = "PROJ",
            orgId = "org-1",
            teamId = "team-2",
            ownerId = null,
            name = "Project",
        )
        val childTeam = TeamEntity(id = "team-2", orgId = "org-1", parentTeamId = "team-1", name = "Child")
        val parentTeam = TeamEntity(id = "team-1", orgId = "org-1", parentTeamId = null, name = "Parent")
        every { currentUserService.currentUserId() } returns "user-1"
        every { membershipRepository.existsByUserIdAndProjectId("user-1", "project-1") } returns false
        every { projectRepository.findById("project-1") } returns Optional.of(project)
        every { orgMembershipRepository.existsByUserIdAndOrgId("user-1", "org-1") } returns false
        every { teamMembershipRepository.existsByUserIdAndTeamId("user-1", "team-2") } returns false
        every { teamRepository.findById("team-2") } returns Optional.of(childTeam)
        every { teamMembershipRepository.existsByUserIdAndTeamId("user-1", "team-1") } returns true
        every { teamRepository.findById("team-1") } returns Optional.of(parentTeam)

        assertTrue(policy.canCreateIssue("project-1"))
    }

    @Test
    fun `allows view when issue is in project membership`() {
        val user = UserEntity(id = "user-1", displayName = "User")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            description = "Issue description.",
            owner = user,
            projectId = "project-1",
            status = IssueStatus.CREATED.name,
        )
        every { currentUserService.currentUserId() } returns "user-1"
        every { issueRepository.findById("issue-1") } returns Optional.of(issue)
        every { membershipRepository.existsByUserIdAndProjectId("user-1", "project-1") } returns true
        every { projectRepository.findById("project-1") } returns Optional.of(
            ProjectEntity(
                id = "project-1",
                key = "PROJ",
                orgId = "org-1",
                teamId = "team-1",
                ownerId = null,
                name = "Project",
            ),
        )

        assertTrue(policy.canViewIssue("issue-1"))
    }
}
