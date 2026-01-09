package sh.nunc.causa.eventstore

interface EventStore {

    fun loadStream(aggregateId: String): List<EventRecord>

    fun listAggregateIds(aggregateType: String): List<String>

    fun appendToStream(
        aggregateId: String,
        expectedSequence: Long,
        events: List<EventRecord>,
    )
}
