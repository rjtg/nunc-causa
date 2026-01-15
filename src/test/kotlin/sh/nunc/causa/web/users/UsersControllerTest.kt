package sh.nunc.causa.web.users

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.get
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.CreatePhaseCommand
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.TaskDependencyView
import sh.nunc.causa.tenancy.ProjectRepository
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev", "test")
class UsersControllerTest {
    @Autowired
    private lateinit var mockMvc: org.springframework.test.web.servlet.MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var projectRepository: ProjectRepository

    @Autowired
    private lateinit var issueService: IssueService

    @BeforeEach
    fun ensureDevUserExists() {
        if (!userRepository.existsById("dev")) {
            userRepository.save(
                UserEntity(id = "dev", displayName = "Dev User", email = "dev@causa.local"),
            )
        }
    }

    @Test
    @WithMockUser(username = "dev", roles = ["ADMIN"])
    fun listUsersIncludesWorkloadCounts() {
        val project = projectRepository.findById("project-alpha")
            .orElseThrow { IllegalStateException("project-alpha should exist in dev data") }

        val issue = issueService.createIssue(
            CreateIssueCommand(
                title = "Workload seed",
                description = "Workload seed issue",
                ownerId = "dev",
                projectId = project.id,
                deadline = null,
                phases = listOf(
                    CreatePhaseCommand(
                        name = "Investigation",
                        assigneeId = "dev",
                        kind = "INVESTIGATION",
                        deadline = null,
                    ),
                ),
            ),
        )
        issueService.addTask(
            issueId = issue.id,
            phaseId = issue.phases.first().id,
            title = "Seed task",
            assigneeId = "dev",
            startDate = null,
            dueDate = null,
            dependencies = emptyList(),
        )

        val response = mockMvc.get("/users") {
            param("projectId", project.id)
        }.andExpect {
            status { isOk() }
        }.andReturn().response.contentAsString

        val payload = objectMapper.readValue(response, Array<UserSummary>::class.java).toList()
        val dev = payload.firstOrNull { it.id == "dev" }
            ?: throw AssertionError("Dev user not returned")
        assert(dev.openIssueCount >= 1)
        assert(dev.openPhaseCount >= 1)
        assert(dev.openTaskCount >= 1)
    }
}
