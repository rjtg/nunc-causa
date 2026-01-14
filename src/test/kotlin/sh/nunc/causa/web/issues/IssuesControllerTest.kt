package sh.nunc.causa.web.issues

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.post
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class IssuesControllerTest {

    @Autowired
    private lateinit var mockMvc: org.springframework.test.web.servlet.MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @BeforeEach
    fun ensureUserExists() {
        if (!userRepository.existsById("dev")) {
            userRepository.save(
                UserEntity(id = "dev", displayName = "Dev User", email = "dev@causa.local"),
            )
        }
    }

    @Test
    @WithMockUser(username = "dev", roles = ["ADMIN"])
    fun createIssueAcceptsJsonPayload() {
        val payload = mapOf(
            "title" to "tadaa",
            "description" to "Something is not behaving as expected.",
            "ownerId" to "dev",
            "projectId" to "project-alpha",
            "phases" to listOf(
                mapOf(
                    "name" to "investigate",
                    "assigneeId" to "dev",
                    "kind" to "INVESTIGATION",
                ),
            ),
        )

        mockMvc.post("/issues") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }
            .andExpect {
                status { isCreated() }
                content { contentType(MediaType.APPLICATION_JSON) }
                jsonPath("$.title") { value("tadaa") }
                jsonPath("$.ownerId") { value("dev") }
            }
    }
}
