package sh.nunc.causa.issues

import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class IssueWorkflowService(
    private val issueRepository: IssueRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val activityRecorder: IssueActivityRecorder,
) {
    @Transactional
    fun closeIssue(issueId: String): IssueEntity {
        val issue = getIssue(issueId)
        val hasIncompletePhase = issue.phases.any { it.status != PhaseStatus.DONE.name }
        if (hasIncompletePhase) {
            throw IllegalStateException("Issue $issueId has incomplete phases")
        }
        if (!requiredKindsPresent(issue)) {
            throw IllegalStateException("Issue $issueId is missing required phases")
        }
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "ISSUE_CLOSED", "Issue closed")
        return saved
    }

    @Transactional
    fun abandonIssue(issueId: String): IssueEntity {
        val issue = getIssue(issueId)
        if (issue.phases.isEmpty()) {
            issue.status = IssueStatus.FAILED.name
        } else {
            issue.phases.forEach { phase ->
                if (phase.status != PhaseStatus.DONE.name) {
                    phase.status = PhaseStatus.FAILED.name
                }
            }
            issue.status = deriveIssueStatus(issue).name
        }
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "ISSUE_ABANDONED", "Issue abandoned")
        return saved
    }

    @Transactional
    fun failPhase(issueId: String, phaseId: String): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        phase.status = PhaseStatus.FAILED.name
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "PHASE_FAILED", "Phase failed")
        return saved
    }

    @Transactional
    fun reopenPhase(issueId: String, phaseId: String): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        phase.status = PhaseStatus.IN_PROGRESS.name
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "PHASE_REOPENED", "Phase reopened")
        return saved
    }

    fun deriveIssueStatus(issue: IssueEntity): IssueStatus {
        if (issue.phases.isEmpty()) {
            return IssueStatus.CREATED
        }
        val phaseStatuses = issue.phases.map { PhaseStatus.valueOf(it.status) }
        val inProgressKinds = issue.phases
            .filter { it.status == PhaseStatus.IN_PROGRESS.name }
            .mapNotNull { PhaseKind.from(it.kind) }
        val phaseKinds = issue.phases.mapNotNull { PhaseKind.from(it.kind) }
        val requiredKindsPresent = PhaseKind.requiredKinds().all { required ->
            phaseKinds.contains(required)
        }
        val nextPendingKind = listOf(
            PhaseKind.INVESTIGATION,
            PhaseKind.PROPOSE_SOLUTION,
            PhaseKind.DEVELOPMENT,
            PhaseKind.ACCEPTANCE_TEST,
            PhaseKind.ROLLOUT,
        ).firstOrNull { kind ->
            issue.phases.any { phase ->
                PhaseKind.from(phase.kind) == kind &&
                    PhaseStatus.valueOf(phase.status) != PhaseStatus.DONE
            }
        }
        return when {
            phaseStatuses.any { it == PhaseStatus.FAILED } -> IssueStatus.FAILED
            phaseStatuses.all { it == PhaseStatus.DONE } && requiredKindsPresent -> IssueStatus.DONE
            inProgressKinds.contains(PhaseKind.ROLLOUT) -> IssueStatus.IN_ROLLOUT
            inProgressKinds.contains(PhaseKind.ACCEPTANCE_TEST) -> IssueStatus.IN_TEST
            inProgressKinds.contains(PhaseKind.DEVELOPMENT) -> IssueStatus.IN_DEVELOPMENT
            inProgressKinds.any { it.isAnalysis() } -> IssueStatus.IN_ANALYSIS
            nextPendingKind != null -> IssueStatus.NOT_ACTIVE
            else -> IssueStatus.NOT_ACTIVE
        }
    }

    private fun requiredKindsPresent(issue: IssueEntity): Boolean {
        val phaseKinds = issue.phases.mapNotNull { PhaseKind.from(it.kind) }
        return PhaseKind.requiredKinds().all { required -> phaseKinds.contains(required) }
    }

    private fun getIssue(issueId: String): IssueEntity {
        return issueRepository.findById(issueId)
            .orElseThrow { NoSuchElementException("Issue $issueId not found") }
    }
}
