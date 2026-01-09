package sh.nunc.causa.reporting

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import sh.nunc.causa.eventstore.EventStore
import sh.nunc.causa.issues.Issue
import sh.nunc.causa.issues.IssueEventMapper
import sh.nunc.causa.issues.IssueEventTypes
import sh.nunc.causa.issues.IssueId

@Component
@ConditionalOnProperty("causa.projections.rebuild-on-startup", havingValue = "true")
class IssueProjectionRebuildRunner(
    private val eventStore: EventStore,
    private val projectionUpdater: IssueProjectionUpdater,
    private val objectMapper: ObjectMapper,
) : ApplicationRunner {

    override fun run(args: ApplicationArguments?) {
        val eventMapper = IssueEventMapper(objectMapper)
        val ids = eventStore.listAggregateIdsByEventTypes(IssueEventTypes.all)
        ids.forEach { id ->
            val history = eventStore.loadStream(id)
            if (history.isEmpty()) return@forEach
            val issue = Issue.rehydrate(history.map { eventMapper.toEnvelope(it) })
            projectionUpdater.rebuild(issue)
        }
    }
}
