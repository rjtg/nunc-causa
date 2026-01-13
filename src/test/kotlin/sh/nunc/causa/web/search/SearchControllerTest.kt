package sh.nunc.causa.web.search

import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.users.UserEntity

class SearchControllerTest {
    @Test
    fun `search maps issues to list items`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Search term",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.CREATED.name,
        )
        val service = mockk<IssueService>()
        every { service.searchIssues("term", "project-1") } returns listOf(issue)

        val controller = SearchController(service)
        val response = controller.searchIssues("term", "project-1")

        assertEquals(1, response.body?.size)
        assertEquals("issue-1", response.body?.first()?.id)
    }
}
