package sh.nunc.causa.issues

import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository
import java.util.UUID

@Service
class IssueService(
    private val issueRepository: IssueRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val userRepository: UserRepository,
) {
    @Transactional
    fun createIssue(command: CreateIssueCommand): IssueEntity {
        val owner = requireUser(command.owner)
        val issue = IssueEntity(
            id = UUID.randomUUID().toString(),
            title = command.title,
            owner = owner,
            projectId = command.projectId,
            status = PhaseStatus.NOT_STARTED.name,
        )

        command.phases.forEach { phaseCommand ->
            val assignee = requireUser(phaseCommand.assignee)
            val phase = PhaseEntity(
                id = UUID.randomUUID().toString(),
                name = phaseCommand.name,
                assignee = assignee,
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
            .filter { issue -> owner == null || issue.owner.id == owner }
            .filter { issue -> projectId == null || issue.projectId == projectId }
            .filter { issue ->
                assignee == null || issue.phases.any { it.assignee.id == assignee }
            }
            .filter { issue ->
                member == null || issue.owner.id == member || issue.phases.any { phase ->
                    phase.assignee.id == member || phase.tasks.any { it.assignee?.id == member }
                }
            }
    }

    @Transactional
    fun assignOwner(issueId: String, owner: String): IssueEntity {
        val issue = getIssue(issueId)
        issue.owner = requireUser(owner)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun addPhase(issueId: String, name: String, assignee: String): IssueEntity {
        val issue = getIssue(issueId)
        val assigneeEntity = requireUser(assignee)
        val phase = PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            assignee = assigneeEntity,
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
        phase.assignee = requireUser(assignee)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun addTask(issueId: String, phaseId: String, title: String, assignee: String?): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val assigneeEntity = assignee?.let { requireUser(it) }
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title,
            assignee = assigneeEntity,
            status = TaskStatus.NOT_STARTED.name,
            phase = phase,
        )
        phase.tasks.add(task)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    private fun requireUser(userId: String): UserEntity {
        return userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User $userId not found") }
    }
}
