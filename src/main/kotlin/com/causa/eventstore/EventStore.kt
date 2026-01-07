package com.causa.eventstore

interface EventStore {

    fun loadStream(aggregateId: String): List<EventRecord>

    fun appendToStream(
        aggregateId: String,
        expectedSequence: Long,
        events: List<EventRecord>,
    )
}
