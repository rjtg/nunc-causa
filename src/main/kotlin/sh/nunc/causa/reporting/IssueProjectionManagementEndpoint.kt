package sh.nunc.causa.reporting

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.boot.actuate.endpoint.annotation.Endpoint
import org.springframework.boot.actuate.endpoint.annotation.Selector
import org.springframework.boot.actuate.endpoint.annotation.WriteOperation
import org.springframework.stereotype.Component
import sh.nunc.causa.eventstore.EventStore
import sh.nunc.causa.issues.Issue
import sh.nunc.causa.issues.IssueEventMapper
import sh.nunc.causa.issues.IssueEventTypes

@Component
@Endpoint(id = "issueprojections")
class IssueProjectionManagementEndpoint(
    private val eventStore: EventStore,
    private val projectionRebuildService: ProjectionRebuildService,
    private val objectMapper: ObjectMapper,
) {
    @WriteOperation
    fun rebuildAll(): Map<String, Any> {
        val eventMapper = IssueEventMapper(objectMapper)
        val ids = eventStore.listAggregateIdsByEventTypes(IssueEventTypes.all)
        ids.forEach { id ->
            val history = eventStore.loadStream(id)
            if (history.isEmpty()) return@forEach
            val issue = Issue.rehydrate(history.map { eventMapper.toEnvelope(it) })
            projectionRebuildService.rebuildIssue(issue)
        }
        return mapOf("rebuilt" to ids.size)
    }

    @WriteOperation
    fun rebuild(@Selector issueId: String): Map<String, Any> {
        val eventMapper = IssueEventMapper(objectMapper)
        val history = eventStore.loadStream(issueId)
        if (history.isEmpty()) {
            return mapOf("rebuilt" to 0)
        }
        val issue = Issue.rehydrate(history.map { eventMapper.toEnvelope(it) })
        projectionRebuildService.rebuildIssue(issue)
        return mapOf("rebuilt" to 1, "issueId" to issueId)
    }
}
