package sh.nunc.causa.issues

import sh.nunc.causa.eventstore.EventStore
import com.fasterxml.jackson.databind.ObjectMapper
import java.time.Clock
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import sh.nunc.causa.reporting.IssueProjectionUpdater

data class CreateIssueCommand(
    val title: String,
    val owner: String,
    val projectId: String?,
    val phases: List<CreatePhaseCommand>,
)

data class CreatePhaseCommand(
    val name: String,
    val assignee: String,
)

@Service
class IssueCommandHandler(
    private val eventStore: EventStore,
    private val projectionUpdater: IssueProjectionUpdater,
    private val objectMapper: ObjectMapper,
    private val clock: Clock = Clock.systemUTC(),
) {
    private val eventMapper = IssueEventMapper(objectMapper)

    fun createIssue(command: CreateIssueCommand): IssueId {
        val issueId = IssueId.newId()
        val occurredAt = Instant.now(clock)
        var sequence = 1L

        val events = mutableListOf(
            eventMapper.toRecord(
                aggregateId = issueId,
                sequence = sequence++,
                event = IssueCreated(
                    issueId = issueId.value,
                    title = command.title,
                    owner = command.owner,
                    projectId = command.projectId,
                ),
                occurredAt = occurredAt,
            ),
        )

        command.phases.forEach { phase ->
            events.add(
                eventMapper.toRecord(
                    aggregateId = issueId,
                    sequence = sequence++,
                    event = PhaseAdded(
                        issueId = issueId.value,
                        phaseId = UUID.randomUUID().toString(),
                        name = phase.name,
                        assignee = phase.assignee,
                        status = PhaseStatus.NOT_STARTED,
                    ),
                    occurredAt = occurredAt,
                ),
            )
        }

        eventStore.appendToStream(
            aggregateId = issueId.value,
            expectedSequence = 0,
            events = events,
        )

        val history = eventStore.loadStream(issueId.value)
        val issue = Issue.rehydrate(history.map { eventMapper.toEnvelope(it) })
        rebuildProjection(issue)

        return issueId
    }

    private fun rebuildProjection(issue: Issue) {
        var attempt = 0
        var lastError: Exception? = null
        while (attempt < 3) {
            try {
                projectionUpdater.rebuild(issue)
                return
            } catch (ex: Exception) {
                lastError = ex
                attempt += 1
            }
        }
        throw IllegalStateException("Failed to rebuild issue projection after retries", lastError)
    }
}
