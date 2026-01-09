package sh.nunc.causa.web.issues

import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import sh.nunc.causa.issues.IssueCommandHandler
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.IssueId
import sh.nunc.causa.issues.IssueUpdateHandler
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.reporting.IssueProjection
import sh.nunc.causa.reporting.IssueProjectionReader
import sh.nunc.causa.reporting.PhaseProjection

@WebMvcTest(IssuesController::class)
class IssuesControllerTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @MockBean
    private lateinit var issueCommandHandler: IssueCommandHandler

    @MockBean
    private lateinit var issueUpdateHandler: IssueUpdateHandler

    @MockBean
    private lateinit var issueProjectionReader: IssueProjectionReader

    @Test
    fun `lists issues with filters`() {
        val issue = IssueProjection(
            id = "issue-1",
            title = "Test",
            owner = "alice",
            projectId = null,
            status = PhaseStatus.IN_PROGRESS,
            phaseCount = 1,
            version = 1,
            phases = emptyList(),
        )
        `when`(issueProjectionReader.listIssues("alice", null, null, null)).thenReturn(listOf(issue))

        mockMvc.get("/issues") {
            param("owner", "alice")
        }.andExpect {
            status { isOk() }
            content { contentType(MediaType.APPLICATION_JSON) }
            jsonPath("$[0].id") { value("issue-1") }
            jsonPath("$[0].owner") { value("alice") }
        }
    }

    @Test
    fun `returns 404 when issue is missing`() {
        `when`(issueProjectionReader.getIssue(IssueId("missing"))).thenReturn(null)

        mockMvc.get("/issues/missing")
            .andExpect {
                status { isNotFound() }
            }
    }

    @Test
    fun `creates issue from request`() {
        val issueId = IssueId("issue-2")
        val expectedCommand = CreateIssueCommand(
            title = "New",
            owner = "bob",
            projectId = "project-1",
            phases = emptyList(),
        )
        val projection = IssueProjection(
            id = "issue-2",
            title = "New",
            owner = "bob",
            projectId = "project-1",
            status = PhaseStatus.NOT_STARTED,
            phaseCount = 0,
            version = 1,
            phases = emptyList(),
        )
        `when`(issueCommandHandler.createIssue(expectedCommand)).thenReturn(issueId)
        `when`(issueProjectionReader.getIssue(issueId)).thenReturn(projection)

        mockMvc.post("/issues") {
            contentType = MediaType.APPLICATION_JSON
            content = """
            {
              "title": "New",
              "owner": "bob",
              "projectId": "project-1",
              "phases": []
            }
            """.trimIndent()
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { value("issue-2") }
            jsonPath("$.projectId") { value("project-1") }
        }
    }

    @Test
    fun `adds a phase to issue`() {
        val projection = IssueProjection(
            id = "issue-3",
            title = "Phase",
            owner = "alice",
            projectId = null,
            status = PhaseStatus.IN_PROGRESS,
            phaseCount = 1,
            version = 2,
            phases = listOf(
                PhaseProjection(
                    id = "phase-1",
                    name = "Investigation",
                    assignee = "bob",
                    status = PhaseStatus.IN_PROGRESS,
                    tasks = emptyList(),
                ),
            ),
        )
        `when`(issueProjectionReader.getIssue(IssueId("issue-3"))).thenReturn(projection)

        mockMvc.post("/issues/issue-3/phases") {
            contentType = MediaType.APPLICATION_JSON
            content = """
            {
              "name": "Investigation",
              "assignee": "bob"
            }
            """.trimIndent()
        }.andExpect {
            status { isOk() }
            jsonPath("$.phases[0].id") { value("phase-1") }
        }
    }

    @Test
    fun `assigns phase assignee`() {
        val projection = IssueProjection(
            id = "issue-4",
            title = "Assignee",
            owner = "alice",
            projectId = null,
            status = PhaseStatus.IN_PROGRESS,
            phaseCount = 1,
            version = 2,
            phases = emptyList(),
        )
        `when`(issueProjectionReader.getIssue(IssueId("issue-4"))).thenReturn(projection)

        mockMvc.patch("/issues/issue-4/phases/phase-1/assignee") {
            contentType = MediaType.APPLICATION_JSON
            content = """
            {
              "assignee": "carol"
            }
            """.trimIndent()
        }.andExpect {
            status { isOk() }
        }
    }
}
