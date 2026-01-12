package sh.nunc.causa.issues

import java.util.UUID
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class IssueService(
    private val issueRepository: IssueRepository,
    private val eventPublisher: ApplicationEventPublisher,
) {
    @Transactional
    fun createIssue(command: CreateIssueCommand): IssueEntity {
        val issue = IssueEntity(
            id = UUID.randomUUID().toString(),
            title = command.title,
            owner = command.owner,
            projectId = command.projectId,
            status = PhaseStatus.NOT_STARTED.name,
        )

        command.phases.forEach { phaseCommand ->
            val phase = PhaseEntity(
                id = UUID.randomUUID().toString(),
                name = phaseCommand.name,
                assignee = phaseCommand.assignee,
                status = PhaseStatus.NOT_STARTED.name,
                kind = null,
                issue = issue,
            )
            issue.phases.add(phase)
        }

        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional(readOnly = true)
    fun getIssue(issueId: String): IssueEntity {
        return issueRepository.findById(issueId)
            .orElseThrow { NoSuchElementException("Issue $issueId not found") }
    }

    @Transactional(readOnly = true)
    fun listIssues(
        owner: String?,
        assignee: String?,
        member: String?,
        projectId: String?,
    ): List<IssueEntity> {
        return issueRepository.findAll()
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

    @Transactional
    fun assignOwner(issueId: String, owner: String): IssueEntity {
        val issue = getIssue(issueId)
        issue.owner = owner
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun addPhase(issueId: String, name: String, assignee: String): IssueEntity {
        val issue = getIssue(issueId)
        val phase = PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            assignee = assignee,
            status = PhaseStatus.NOT_STARTED.name,
            kind = null,
            issue = issue,
        )
        issue.phases.add(phase)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun assignPhaseAssignee(issueId: String, phaseId: String, assignee: String): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        phase.assignee = assignee
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun addTask(issueId: String, phaseId: String, title: String, assignee: String?): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title,
            assignee = assignee,
            status = TaskStatus.NOT_STARTED.name,
            phase = phase,
        )
        phase.tasks.add(task)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }
}
