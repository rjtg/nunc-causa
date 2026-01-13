package sh.nunc.causa.web.updates

import io.mockk.every
import io.mockk.mockk
import java.util.Optional
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.tenancy.ProjectMembershipRepository
import sh.nunc.causa.users.UserEntity

class UpdateStreamServiceTest {
    @Test
    fun `register returns emitter`() {
        val issueRepository = mockk<IssueRepository>()
        val membershipRepository = mockk<ProjectMembershipRepository>()
        val service = UpdateStreamService(issueRepository, membershipRepository)

        val emitter = service.register("user-1")

        assertNotNull(emitter)
    }

    @Test
    fun `broadcast and keepalive do not fail without emitters`() {
        val issueRepository = mockk<IssueRepository>()
        val membershipRepository = mockk<ProjectMembershipRepository>()
        val service = UpdateStreamService(issueRepository, membershipRepository)

        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Issue",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.CREATED.name,
        )
        every { issueRepository.findById("issue-1") } returns Optional.of(issue)
        every { membershipRepository.existsByUserIdAndProjectId(any(), any()) } returns false

        service.broadcast(UiUpdate(type = "ISSUE_UPDATED", issueId = "issue-1"))
        service.keepalive()
    }
}
