package sh.nunc.causa.issues

import sh.nunc.causa.eventstore.EventRecord
import com.fasterxml.jackson.databind.ObjectMapper
import java.time.Instant
import java.util.UUID

class IssueEventMapper(
    private val objectMapper: ObjectMapper,
) {
    fun toRecord(
        aggregateId: IssueId,
        sequence: Long,
        event: IssueEvent,
        occurredAt: Instant,
    ): EventRecord {
        val metadata = objectMapper.createObjectNode().put("aggregateType", "issue")
        return EventRecord(
            id = UUID.randomUUID(),
            aggregateId = aggregateId.value,
            type = event::class.simpleName ?: "UnknownEvent",
            payload = objectMapper.valueToTree(event),
            metadata = metadata,
            sequence = sequence,
            occurredAt = occurredAt,
        )
    }

    fun toEnvelope(record: EventRecord): IssueEventEnvelope {
        return IssueEventEnvelope(
            sequence = record.sequence,
            event = fromRecord(record),
        )
    }

    private fun fromRecord(record: EventRecord): IssueEvent {
        return when (record.type) {
            IssueCreated::class.simpleName ->
                objectMapper.treeToValue(record.payload, IssueCreated::class.java)
            PhaseAdded::class.simpleName ->
                objectMapper.treeToValue(record.payload, PhaseAdded::class.java)
            IssueOwnerAssigned::class.simpleName ->
                objectMapper.treeToValue(record.payload, IssueOwnerAssigned::class.java)
            PhaseAssigneeAssigned::class.simpleName ->
                objectMapper.treeToValue(record.payload, PhaseAssigneeAssigned::class.java)
            TaskAdded::class.simpleName ->
                objectMapper.treeToValue(record.payload, TaskAdded::class.java)
            else -> error("Unknown event type: ${record.type}")
        }
    }
}
