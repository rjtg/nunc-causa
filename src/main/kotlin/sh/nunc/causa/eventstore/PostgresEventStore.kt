package sh.nunc.causa.eventstore

import com.fasterxml.jackson.databind.ObjectMapper
import java.sql.Types
import java.util.UUID
import org.springframework.context.annotation.Profile
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Profile("postgres")
@Repository
class PostgresEventStore(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
) : EventStore {

    override fun loadStream(aggregateId: String): List<EventRecord> {
        val sql = """
            select id, aggregate_id, type, payload, metadata, sequence, occurred_at
            from events
            where aggregate_id = ?
            order by sequence
        """.trimIndent()

        return jdbcTemplate.query(sql, { rs, _ ->
            val payload = objectMapper.readTree(rs.getString("payload"))
            val metadataValue = rs.getString("metadata")
            val metadata = metadataValue?.let { objectMapper.readTree(it) }

            EventRecord(
                id = rs.getObject("id", UUID::class.java),
                aggregateId = rs.getString("aggregate_id"),
                type = rs.getString("type"),
                payload = payload,
                metadata = metadata,
                sequence = rs.getLong("sequence"),
                occurredAt = rs.getTimestamp("occurred_at").toInstant(),
            )
        }, aggregateId)
    }

    override fun listAggregateIds(): List<String> {
        val sql = """
            select distinct aggregate_id
            from events
            order by aggregate_id
        """.trimIndent()

        return jdbcTemplate.query(sql) { rs, _ -> rs.getString("aggregate_id") }
    }

    override fun appendToStream(
        aggregateId: String,
        expectedSequence: Long,
        events: List<EventRecord>,
    ) {
        val currentSequenceSql = """
            select coalesce(max(sequence), 0)
            from events
            where aggregate_id = ?
        """.trimIndent()
        val currentSequence = jdbcTemplate.queryForObject(
            currentSequenceSql,
            Long::class.java,
            aggregateId,
        ) ?: 0

        if (currentSequence != expectedSequence) {
            throw OptimisticConcurrencyException(
                "Expected sequence $expectedSequence but found $currentSequence for aggregate $aggregateId",
            )
        }

        val sql = """
            insert into events
                (id, aggregate_id, type, payload, metadata, sequence, occurred_at)
            values
                (?, ?, ?, ?::jsonb, ?::jsonb, ?, ?)
        """.trimIndent()

        jdbcTemplate.batchUpdate(sql, events, events.size) { ps, event ->
            ps.setObject(1, event.id)
            ps.setString(2, aggregateId)
            ps.setString(3, event.type)
            ps.setString(4, objectMapper.writeValueAsString(event.payload))
            if (event.metadata == null) {
                ps.setNull(5, Types.OTHER)
            } else {
                ps.setString(5, objectMapper.writeValueAsString(event.metadata))
            }
            ps.setLong(6, event.sequence)
            ps.setTimestamp(7, java.sql.Timestamp.from(event.occurredAt))
        }
    }
}
