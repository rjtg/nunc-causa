package sh.nunc.causa.web.issues

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import com.ninjasquad.springmockk.MockkBean
import io.mockk.every
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.IssueCommentService
import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.PhaseEntity
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.tenancy.AccessPolicyService
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.web.model.IssueHistoryResponse
import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.test.context.support.WithMockUser

@WebMvcTest(IssuesController::class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockKExtension::class)
@WithMockUser(username = "alice")
class IssuesControllerTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @MockkBean
    private lateinit var issueService: IssueService
    @MockkBean
    private lateinit var accessPolicy: AccessPolicyService
    @MockkBean
    private lateinit var issueCommentService: IssueCommentService
    @MockkBean
    private lateinit var issueHistoryService: IssueHistoryService

    @BeforeEach
    fun allowAccess() {
        every { accessPolicy.currentUserId() } returns "alice"
        every { accessPolicy.canCreateIssue(any()) } returns true
        every { accessPolicy.canViewIssue(any()) } returns true
        every { accessPolicy.canListIssues(any()) } returns true
        every { accessPolicy.canModifyIssue(any()) } returns true
        every { issueCommentService.listComments(any()) } returns emptyList()
        every { issueHistoryService.getHistory(any()) } returns IssueHistoryResponse(activity = emptyList(), audit = emptyList())
    }

    @Test
    fun `lists issues with filters`() {
        val owner = UserEntity(id = "alice", displayName = "Alice Example")
        val issue = IssueEntity(
            id = "issue-1",
            title = "Test",
            owner = owner,
            projectId = null,
            status = IssueStatus.IN_ANALYSIS.name,
        )
        every { issueService.listIssues("alice", null, "alice", null, null, null) } returns listOf(issue)

        mockMvc.get("/issues") {
            param("ownerId", "alice")
        }.andExpect {
            status { isOk() }
            content { contentType(MediaType.APPLICATION_JSON) }
            jsonPath("$[0].id") { value("issue-1") }
            jsonPath("$[0].ownerId") { value("alice") }
        }
    }

    @Test
    fun `returns 404 when issue is missing`() {
        every { issueService.getIssue("missing") } throws NoSuchElementException("Issue missing not found")

        mockMvc.get("/issues/missing")
            .andExpect {
                status { isNotFound() }
            }
    }

    @Test
    fun `creates issue from request`() {
        val expectedCommand = CreateIssueCommand(
            title = "New",
            ownerId = "bob",
            projectId = "project-1",
            phases = emptyList(),
        )
        val owner = UserEntity(id = "bob", displayName = "Bob Example")
        val issue = IssueEntity(
            id = "issue-2",
            title = "New",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.CREATED.name,
        )
        every { issueService.createIssue(expectedCommand) } returns issue

        mockMvc.post("/issues") {
            contentType = MediaType.APPLICATION_JSON
            content = """
            {
              "title": "New",
              "ownerId": "bob",
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
        val owner = UserEntity(id = "alice", displayName = "Alice Example")
        val assignee = UserEntity(id = "bob", displayName = "Bob Example")
        val issue = IssueEntity(
            id = "issue-3",
            title = "Phase",
            owner = owner,
            projectId = null,
            status = IssueStatus.IN_ANALYSIS.name,
        )
        issue.phases.add(
            PhaseEntity(
                id = "phase-1",
                name = "Investigation",
                assignee = assignee,
                status = PhaseStatus.IN_PROGRESS.name,
                kind = null,
                issue = issue,
            ),
        )
        every { issueService.addPhase("issue-3", "Investigation", "bob", null) } returns issue

        mockMvc.post("/issues/issue-3/phases") {
            contentType = MediaType.APPLICATION_JSON
            content = """
            {
              "name": "Investigation",
              "assigneeId": "bob"
            }
            """.trimIndent()
        }.andExpect {
            status { isOk() }
            jsonPath("$.phases[0].id") { value("phase-1") }
        }
    }

    @Test
    fun `assigns phase assignee`() {
        val owner = UserEntity(id = "alice", displayName = "Alice Example")
        val issue = IssueEntity(
            id = "issue-4",
            title = "Assignee",
            owner = owner,
            projectId = null,
            status = IssueStatus.IN_ANALYSIS.name,
        )
        every { issueService.assignPhaseAssignee("issue-4", "phase-1", "carol") } returns issue

        mockMvc.patch("/issues/issue-4/phases/phase-1/assignee") {
            contentType = MediaType.APPLICATION_JSON
            content = """
            {
              "assigneeId": "carol"
            }
            """.trimIndent()
        }.andExpect {
            status { isOk() }
        }
    }
}
