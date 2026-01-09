package sh.nunc.causa.issues

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import sh.nunc.causa.eventstore.EventStore

@Service
class IssueReadService(
    private val eventStore: EventStore,
    private val objectMapper: ObjectMapper,
) {
    private val eventMapper = IssueEventMapper(objectMapper)

    fun getIssue(issueId: IssueId): Issue {
        val history = eventStore.loadStream(issueId.value)
        if (history.isEmpty()) {
            throw NoSuchElementException("Issue ${issueId.value} not found")
        }
        val envelopes = history.map { eventMapper.toEnvelope(it) }
        return Issue.rehydrate(envelopes)
    }

    fun getHistory(issueId: IssueId): List<IssueEventEnvelope> {
        val history = eventStore.loadStream(issueId.value)
        if (history.isEmpty()) {
            throw NoSuchElementException("Issue ${issueId.value} not found")
        }
        return history.map { eventMapper.toEnvelope(it) }
    }

    fun listIssues(
        owner: String?,
        assignee: String?,
        member: String?,
        projectId: String?,
    ): List<Issue> {
        val ids = eventStore.listAggregateIds()
        return ids.map { getIssue(IssueId(it)) }
            .filter { issue -> owner == null || issue.owner == owner }
            .filter { issue -> projectId == null || issue.projectId == projectId }
            .filter { issue ->
                assignee == null || issue.phases.any { it.assignee == assignee }
            }
            .filter { issue ->
                member == null || issue.owner == member || issue.phases.any { phase ->
                    phase.assignee == member || phase.tasks.any { it.assignee == member }
                }
            }
    }
}
