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
        val owner = requireUser(command.ownerId)
        val issue = IssueEntity(
            id = UUID.randomUUID().toString(),
            title = command.title,
            owner = owner,
            projectId = command.projectId,
            status = IssueStatus.CREATED.name,
        )

        command.phases.forEach { phaseCommand ->
            val assignee = requireUser(phaseCommand.assigneeId)
            val phase = PhaseEntity(
                id = UUID.randomUUID().toString(),
                name = phaseCommand.name,
                assignee = assignee,
                status = PhaseStatus.NOT_STARTED.name,
                kind = phaseCommand.kind,
                issue = issue,
            )
            issue.phases.add(phase)
        }

        issue.status = deriveIssueStatus(issue).name
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
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: IssueStatus?,
        phaseKind: String?,
    ): List<IssueEntity> {
        return issueRepository.findAll()
            .filter { issue -> ownerId == null || issue.owner.id == ownerId }
            .filter { issue -> projectId == null || issue.projectId == projectId }
            .filter { issue ->
                assigneeId == null || issue.phases.any { it.assignee.id == assigneeId }
            }
            .filter { issue ->
                memberId == null || issue.owner.id == memberId || issue.phases.any { phase ->
                    phase.assignee.id == memberId || phase.tasks.any { it.assignee?.id == memberId }
                }
            }
            .filter { issue -> status == null || issue.status == status.name }
            .filter { issue -> phaseKind == null || issue.phases.any { it.kind == phaseKind } }
    }

    @Transactional
    fun updateIssue(issueId: String, title: String?, ownerId: String?, projectId: String?): IssueEntity {
        val issue = getIssue(issueId)
        if (title != null) {
            issue.title = title
        }
        if (ownerId != null) {
            issue.owner = requireUser(ownerId)
        }
        if (projectId != null) {
            issue.projectId = projectId
        }
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun assignOwner(issueId: String, ownerId: String): IssueEntity {
        val issue = getIssue(issueId)
        issue.owner = requireUser(ownerId)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun addPhase(issueId: String, name: String, assigneeId: String, kind: String?): IssueEntity {
        val issue = getIssue(issueId)
        val assigneeEntity = requireUser(assigneeId)
        val phase = PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            assignee = assigneeEntity,
            status = PhaseStatus.NOT_STARTED.name,
            kind = kind,
            issue = issue,
        )
        issue.phases.add(phase)
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun updatePhase(
        issueId: String,
        phaseId: String,
        name: String?,
        assigneeId: String?,
        status: PhaseStatus?,
        kind: String?,
    ): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        if (name != null) {
            phase.name = name
        }
        if (assigneeId != null) {
            phase.assignee = requireUser(assigneeId)
        }
        if (status != null) {
            phase.status = status.name
        }
        if (kind != null) {
            phase.kind = kind
        }
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun assignPhaseAssignee(issueId: String, phaseId: String, assigneeId: String): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        phase.assignee = requireUser(assigneeId)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun addTask(issueId: String, phaseId: String, title: String, assigneeId: String?): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val assigneeEntity = assigneeId?.let { requireUser(it) }
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title,
            assignee = assigneeEntity,
            status = TaskStatus.NOT_STARTED.name,
            phase = phase,
        )
        phase.tasks.add(task)
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun updateTask(
        issueId: String,
        phaseId: String,
        taskId: String,
        title: String?,
        assigneeId: String?,
        status: TaskStatus?,
    ): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val task = phase.tasks.firstOrNull { it.id == taskId }
            ?: throw NoSuchElementException("Task $taskId not found")
        if (title != null) {
            task.title = title
        }
        if (assigneeId != null) {
            task.assignee = requireUser(assigneeId)
        }
        if (status != null) {
            task.status = status.name
        }
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun closeIssue(issueId: String): IssueEntity {
        val issue = getIssue(issueId)
        issue.status = IssueStatus.DONE.name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        return saved
    }

    @Transactional
    fun failPhase(issueId: String, phaseId: String): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        phase.status = PhaseStatus.FAILED.name
        issue.status = IssueStatus.FAILED.name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
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
        return saved
    }

    @Transactional(readOnly = true)
    fun searchIssues(query: String, projectId: String?): List<IssueEntity> {
        val lowered = query.lowercase()
        return issueRepository.findAll()
            .filter { projectId == null || it.projectId == projectId }
            .filter { it.title.lowercase().contains(lowered) }
    }

    @Transactional(readOnly = true)
    fun buildMyWork(userId: String): MyWorkView {
        val issues = issueRepository.findAll()
        val owned = issues.filter { it.owner.id == userId }
        val assignedPhases = issues.flatMap { issue ->
            issue.phases.filter { it.assignee.id == userId }.map { phase ->
                PhaseWorkView(
                    issueId = issue.id,
                    phaseId = phase.id,
                    phaseName = phase.name,
                    status = phase.status,
                )
            }
        }
        val assignedTasks = issues.flatMap { issue ->
            issue.phases.flatMap { phase ->
                phase.tasks.filter { it.assignee?.id == userId }.map { task ->
                    TaskWorkView(
                        issueId = issue.id,
                        phaseId = phase.id,
                        taskId = task.id,
                        taskTitle = task.title,
                        status = task.status,
                    )
                }
            }
        }
        return MyWorkView(owned, assignedPhases, assignedTasks)
    }

    private fun requireUser(userId: String): UserEntity {
        return userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User $userId not found") }
    }

    private fun deriveIssueStatus(issue: IssueEntity): IssueStatus {
        if (issue.phases.isEmpty()) {
            return IssueStatus.CREATED
        }
        val phaseStatuses = issue.phases.map { PhaseStatus.valueOf(it.status) }
        val inProgressKinds = issue.phases.filter { it.status == PhaseStatus.IN_PROGRESS.name }
        val status = when {
            phaseStatuses.any { it == PhaseStatus.FAILED } -> IssueStatus.FAILED
            phaseStatuses.all { it == PhaseStatus.DONE } -> IssueStatus.DONE
            inProgressKinds.any { it.kind == "ROLLOUT" } -> IssueStatus.IN_ROLLOUT
            inProgressKinds.any { it.kind == "ACCEPTANCE_TEST" } -> IssueStatus.IN_TEST
            inProgressKinds.any { it.kind == "DEVELOPMENT" } -> IssueStatus.IN_DEVELOPMENT
            phaseStatuses.any { it == PhaseStatus.IN_PROGRESS } -> IssueStatus.IN_ANALYSIS
            else -> IssueStatus.CREATED
        }
        return status
    }
}
