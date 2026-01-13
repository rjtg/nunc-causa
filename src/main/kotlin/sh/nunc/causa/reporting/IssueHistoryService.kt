package sh.nunc.causa.reporting

import java.time.OffsetDateTime
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.web.model.ActivityEntry
import sh.nunc.causa.web.model.AuditEntry
import sh.nunc.causa.web.model.IssueHistoryResponse

@Service
class IssueHistoryService(
    private val activityRepository: IssueActivityRepository,
) {
    @Transactional(readOnly = true)
    fun getHistory(issueId: String): IssueHistoryResponse {
        val activity = activityRepository.findAllByIssueIdOrderByOccurredAtAsc(issueId)
            .map { it.toEntry() }
        return IssueHistoryResponse(
            activity = activity,
            audit = emptyList(),
        )
    }

    @Transactional
    fun recordActivity(
        issueId: String,
        type: String,
        summary: String,
        actorId: String?,
    ) {
        val entity = IssueActivityEntity(
            id = UUID.randomUUID().toString(),
            issueId = issueId,
            type = type,
            summary = summary,
            actorId = actorId,
            occurredAt = OffsetDateTime.now(),
        )
        activityRepository.save(entity)
    }

    private fun IssueActivityEntity.toEntry(): ActivityEntry {
        return ActivityEntry(
            id = id,
            issueId = issueId,
            type = type,
            summary = summary,
            actorId = actorId,
            occurredAt = occurredAt,
        )
    }
}
