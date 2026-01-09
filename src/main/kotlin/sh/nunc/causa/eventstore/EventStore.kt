package sh.nunc.causa.eventstore

interface EventStore {

    fun loadStream(aggregateId: String): List<sh.nunc.causa.eventstore.EventRecord>

    fun appendToStream(
        aggregateId: String,
        expectedSequence: Long,
        events: List<sh.nunc.causa.eventstore.EventRecord>,
    )
}
