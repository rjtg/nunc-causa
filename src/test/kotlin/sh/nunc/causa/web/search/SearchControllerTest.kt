package sh.nunc.causa.web.search

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueListView
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.tenancy.AccessPolicyService

class SearchControllerTest {
    @Test
    fun `search maps issues to list items`() {
        val issue = IssueListView(
            id = "issue-1",
            title = "Search term",
            ownerId = "owner-1",
            projectId = "project-1",
            phaseCount = 0,
            status = IssueStatus.CREATED.name,
        )
        val service = mockk<IssueService>()
        val accessPolicy = mockk<AccessPolicyService>()
        every { accessPolicy.currentUserId() } returns "user-1"
        every { service.searchIssues("term", "project-1") } returns listOf(issue)

        val controller = SearchController(service, accessPolicy)
        val response = controller.searchIssues("term", "project-1")

        assertEquals(1, response.body?.size)
        assertEquals("issue-1", response.body?.first()?.id)
    }
}
