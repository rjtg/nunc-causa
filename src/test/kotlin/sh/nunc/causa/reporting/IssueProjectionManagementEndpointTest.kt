package sh.nunc.causa.reporting

import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import sh.nunc.causa.eventstore.EventStore

@SpringBootTest
@AutoConfigureMockMvc
class IssueProjectionManagementEndpointTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @MockBean
    private lateinit var eventStore: EventStore

    @MockBean
    private lateinit var projectionRebuildService: ProjectionRebuildService

    @Test
    fun `rejects access without credentials`() {
        mockMvc.post("/actuator/issue-projections")
            .andExpect {
                status { isUnauthorized() }
            }
    }

    @Test
    @WithMockUser(authorities = ["PROJECTION_MANAGE"])
    fun `rebuilds all projections`() {
        `when`(eventStore.listAggregateIdsByEventTypes(IssueEventTypes.all)).thenReturn(emptyList())

        mockMvc.post("/actuator/issue-projections") {
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.rebuilt") { value(0) }
        }
    }
}
