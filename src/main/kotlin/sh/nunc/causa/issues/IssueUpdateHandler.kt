package sh.nunc.causa.issues

import com.fasterxml.jackson.databind.ObjectMapper
import java.time.Clock
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import sh.nunc.causa.eventstore.EventStore
import sh.nunc.causa.reporting.IssueProjectionUpdater

@Service
class IssueUpdateHandler(
    private val eventStore: EventStore,
    private val projectionUpdater: IssueProjectionUpdater,
    private val objectMapper: ObjectMapper,
    private val clock: Clock = Clock.systemUTC(),
) {
    private val eventMapper = IssueEventMapper(objectMapper)

    fun assignOwner(issueId: IssueId, owner: String) {
        appendEvent(issueId) {
            IssueOwnerAssigned(
                issueId = issueId.value,
                owner = owner,
            )
        }
    }

    fun addPhase(issueId: IssueId, name: String, assignee: String) {
        appendEvent(issueId) {
            PhaseAdded(
                issueId = issueId.value,
                phaseId = UUID.randomUUID().toString(),
                name = name,
                assignee = assignee,
                status = PhaseStatus.NOT_STARTED,
            )
        }
    }

    fun assignPhaseAssignee(issueId: IssueId, phaseId: String, assignee: String) {
        val issue = loadIssue(issueId)
        if (issue.phases.none { it.id == phaseId }) {
            throw NoSuchElementException("Phase $phaseId not found")
        }
        appendEvent(issueId) {
            PhaseAssigneeAssigned(
                issueId = issueId.value,
                phaseId = phaseId,
                assignee = assignee,
            )
        }
    }

    fun addTask(issueId: IssueId, phaseId: String, title: String, assignee: String?) {
        val issue = loadIssue(issueId)
        if (issue.phases.none { it.id == phaseId }) {
            throw NoSuchElementException("Phase $phaseId not found")
        }
        appendEvent(issueId) {
            TaskAdded(
                issueId = issueId.value,
                phaseId = phaseId,
                taskId = UUID.randomUUID().toString(),
                title = title,
                assignee = assignee,
                status = TaskStatus.NOT_STARTED,
            )
        }
    }

    private fun appendEvent(issueId: IssueId, eventFactory: () -> IssueEvent) {
        val history = eventStore.loadStream(issueId.value)
        if (history.isEmpty()) {
            throw NoSuchElementException("Issue ${issueId.value} not found")
        }
        val currentSequence = history.maxOf { it.sequence }
        val occurredAt = Instant.now(clock)
        val event = eventFactory()

        val record = eventMapper.toRecord(
            aggregateId = issueId,
            sequence = currentSequence + 1,
            event = event,
            occurredAt = occurredAt,
        )

        eventStore.appendToStream(
            aggregateId = issueId.value,
            expectedSequence = currentSequence,
            events = listOf(record),
        )

        val issue = loadIssue(issueId)
        projectionUpdater.rebuild(issue)
    }

    private fun loadIssue(issueId: IssueId): Issue {
        val history = eventStore.loadStream(issueId.value)
        if (history.isEmpty()) {
            throw NoSuchElementException("Issue ${issueId.value} not found")
        }
        val envelopes = history.map { eventMapper.toEnvelope(it) }
        return Issue.rehydrate(envelopes)
    }
}
