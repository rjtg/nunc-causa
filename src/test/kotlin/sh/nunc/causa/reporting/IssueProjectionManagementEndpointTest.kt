package sh.nunc.causa.reporting

import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.SpringBootConfiguration
import org.springframework.boot.autoconfigure.EnableAutoConfiguration
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.ComponentScan
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import sh.nunc.causa.eventstore.EventStore
import sh.nunc.causa.issues.IssueEventTypes

@SpringBootTest(
    classes = [IssueProjectionManagementEndpointTest.TestApp::class],
    properties = ["spring.liquibase.enabled=false"],
)
@AutoConfigureMockMvc
class IssueProjectionManagementEndpointTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @ComponentScan("sh.nunc.causa")
    class TestApp
    @MockBean
    private lateinit var eventStore: EventStore

    @MockBean
    private lateinit var projectionRebuildService: ProjectionRebuildService

    @Test
    fun `rejects access without credentials`() {
        mockMvc.post("/actuator/issueprojections")
            .andExpect {
                status { isUnauthorized() }
            }
    }

    @Test
    @WithMockUser(authorities = ["PROJECTION_MANAGE"])
    fun `rebuilds all projections`() {
        `when`(eventStore.listAggregateIdsByEventTypes(IssueEventTypes.all)).thenReturn(emptyList())

        mockMvc.post("/actuator/issueprojections") {
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.rebuilt") { value(0) }
        }
    }
}
