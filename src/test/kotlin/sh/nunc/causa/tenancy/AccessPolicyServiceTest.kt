package sh.nunc.causa.tenancy

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import java.util.Optional

class AccessPolicyServiceTest {
    private val currentUserService = mockk<CurrentUserService>()
    private val membershipRepository = mockk<ProjectMembershipRepository>()
    private val issueRepository = mockk<IssueRepository>()
    private val policy = AccessPolicyService(currentUserService, membershipRepository, issueRepository)

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
    fun `allows view when issue is in project membership`() {
        val user = UserEntity(id = "user-1", displayName = "User")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            owner = user,
            projectId = "project-1",
            status = IssueStatus.CREATED.name,
        )
        every { currentUserService.currentUserId() } returns "user-1"
        every { issueRepository.findById("issue-1") } returns Optional.of(issue)
        every { membershipRepository.existsByUserIdAndProjectId("user-1", "project-1") } returns true

        assertTrue(policy.canViewIssue("issue-1"))
    }
}
