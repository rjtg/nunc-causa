package sh.nunc.causa.issues

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import java.time.Instant
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class IssueRehydrationTest {
    @Test
    fun `rehydrates issue from event stream`() {
        val objectMapper = jacksonObjectMapper()
        val eventMapper = IssueEventMapper(objectMapper)
        val issueId = IssueId.newId()
        val occurredAt = Instant.parse("2024-01-01T00:00:00Z")

        val events = listOf(
            IssueCreated(
                issueId = issueId.value,
                title = "Improve login flow",
                owner = "alice",
                projectId = null,
            ),
            PhaseAdded(
                issueId = issueId.value,
                phaseId = "phase-1",
                name = "Investigation",
                assignee = "bob",
                status = PhaseStatus.NOT_STARTED,
            ),
            PhaseAdded(
                issueId = issueId.value,
                phaseId = "phase-2",
                name = "Development",
                assignee = "carol",
                status = PhaseStatus.NOT_STARTED,
            ),
        )

        var sequence = 1L
        val records = events.map { event ->
            eventMapper.toRecord(
                aggregateId = issueId,
                sequence = sequence++,
                event = event,
                occurredAt = occurredAt,
            )
        }

        val history = records.map { eventMapper.toEnvelope(it) }
        val issue = Issue.rehydrate(history)

        assertEquals(issueId, issue.id)
        assertEquals("Improve login flow", issue.title)
        assertEquals("alice", issue.owner)
        assertEquals(2, issue.phases.size)
        assertEquals("Investigation", issue.phases[0].name)
        assertEquals("Development", issue.phases[1].name)
        assertEquals(3L, issue.version)
    }
}
