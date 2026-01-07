package com.causa.eventstore

import com.fasterxml.jackson.databind.JsonNode
import java.time.Instant
import java.util.UUID

data class EventRecord(
    val id: UUID,
    val aggregateId: String,
    val type: String,
    val payload: JsonNode,
    val metadata: JsonNode?,
    val sequence: Long,
    val occurredAt: Instant,
)
