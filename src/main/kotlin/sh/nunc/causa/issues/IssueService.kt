package sh.nunc.causa.issues

import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository
import java.util.UUID

@Service
class IssueService(
    private val issueRepository: IssueRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val userRepository: UserRepository,
    private val historyService: IssueHistoryService,
    private val currentUserService: CurrentUserService,
) {
    @Transactional
    fun createIssue(command: CreateIssueCommand): IssueEntity {
        val owner = requireUser(command.ownerId)
        val issue = IssueEntity(
            id = UUID.randomUUID().toString(),
            title = command.title,
            description = command.description,
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
        recordActivity(saved.id, "ISSUE_CREATED", "Issue created")
        return saved
    }

    @Transactional(readOnly = true)
    fun getIssue(issueId: String): IssueEntity {
        return issueRepository.findById(issueId)
            .orElseThrow { NoSuchElementException("Issue $issueId not found") }
    }

    @Transactional(readOnly = true)
    fun getIssueDetail(issueId: String): IssueDetailView {
        val issue = issueRepository.findDetailById(issueId)
            ?: throw NoSuchElementException("Issue $issueId not found")
        return issue.toDetailView()
    }

    @Transactional(readOnly = true)
    fun listIssues(
        query: String?,
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: IssueStatus?,
        phaseKind: String?,
    ): List<IssueListView> {
        return issueRepository.findListView(
            query = query,
            projectId = projectId,
            ownerId = ownerId,
            assigneeId = assigneeId,
            memberId = memberId,
            status = status?.name,
            phaseKind = phaseKind,
        )
    }

    @Transactional
    fun updateIssue(
        issueId: String,
        title: String?,
        ownerId: String?,
        projectId: String?,
        description: String?,
    ): IssueEntity {
        val issue = getIssue(issueId)
        if (title != null) {
            issue.title = title
        }
        if (description != null) {
            issue.description = description
        }
        if (ownerId != null) {
            issue.owner = requireUser(ownerId)
        }
        if (projectId != null) {
            issue.projectId = projectId
        }
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        recordActivity(saved.id, "ISSUE_UPDATED", "Issue updated")
        return saved
    }

    @Transactional
    fun assignOwner(issueId: String, ownerId: String): IssueEntity {
        val issue = getIssue(issueId)
        issue.owner = requireUser(ownerId)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        recordActivity(saved.id, "OWNER_ASSIGNED", "Issue owner assigned")
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
        recordActivity(saved.id, "PHASE_ADDED", "Phase added")
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
            if (status == PhaseStatus.DONE && phase.tasks.any { it.status != TaskStatus.DONE.name }) {
                throw IllegalStateException("Phase $phaseId has unfinished tasks")
            }
            phase.status = status.name
        }
        if (kind != null) {
            phase.kind = kind
        }
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        recordActivity(saved.id, "PHASE_UPDATED", "Phase updated")
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
        recordActivity(saved.id, "PHASE_ASSIGNEE_CHANGED", "Phase assignee updated")
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
        recordActivity(saved.id, "TASK_ADDED", "Task added")
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
        recordActivity(saved.id, "TASK_UPDATED", "Task updated")
        return saved
    }

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
        recordActivity(saved.id, "ISSUE_CLOSED", "Issue closed")
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
        recordActivity(saved.id, "PHASE_FAILED", "Phase failed")
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
        recordActivity(saved.id, "PHASE_REOPENED", "Phase reopened")
        return saved
    }

    @Transactional(readOnly = true)
    fun searchIssues(query: String, projectId: String?): List<IssueListView> {
        return issueRepository.searchListView(query, projectId)
    }

    @Transactional(readOnly = true)
    fun findSimilarIssues(query: String, limit: Int?): List<IssueListView> {
        return emptyList()
    }

    @Transactional(readOnly = true)
    fun buildMyWork(userId: String): MyWorkView {
        val issues = issueRepository.findFiltered(
            projectId = null,
            ownerId = userId,
            assigneeId = userId,
            memberId = userId,
            status = null,
            phaseKind = null,
        )
        val owned = issues.filter { it.owner.id == userId }.map { issue ->
            IssueListView(
                id = issue.id,
                title = issue.title,
                description = issue.description,
                ownerId = issue.owner.id,
                projectId = issue.projectId,
                phaseCount = issue.phases.size.toLong(),
                status = issue.status,
            )
        }
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
        val inProgressKinds = issue.phases
            .filter { it.status == PhaseStatus.IN_PROGRESS.name }
            .mapNotNull { PhaseKind.from(it.kind) }
        val phaseKinds = issue.phases.mapNotNull { PhaseKind.from(it.kind) }
        val requiredKindsPresent = PhaseKind.requiredKinds().all { required ->
            phaseKinds.contains(required)
        }
        return when {
            phaseStatuses.any { it == PhaseStatus.FAILED } -> IssueStatus.FAILED
            phaseStatuses.all { it == PhaseStatus.DONE } && requiredKindsPresent -> IssueStatus.DONE
            inProgressKinds.contains(PhaseKind.ROLLOUT) -> IssueStatus.IN_ROLLOUT
            inProgressKinds.contains(PhaseKind.ACCEPTANCE_TEST) -> IssueStatus.IN_TEST
            inProgressKinds.contains(PhaseKind.DEVELOPMENT) -> IssueStatus.IN_DEVELOPMENT
            inProgressKinds.any { it.isAnalysis() } -> IssueStatus.IN_ANALYSIS
            else -> IssueStatus.IN_ANALYSIS
        }
    }

    private fun requiredKindsPresent(issue: IssueEntity): Boolean {
        val phaseKinds = issue.phases.mapNotNull { PhaseKind.from(it.kind) }
        return PhaseKind.requiredKinds().all { required -> phaseKinds.contains(required) }
    }

    private fun recordActivity(issueId: String, type: String, summary: String) {
        historyService.recordActivity(
            issueId = issueId,
            type = type,
            summary = summary,
            actorId = currentUserService.currentUserId(),
        )
    }

    private fun IssueEntity.toDetailView(): IssueDetailView {
        return IssueDetailView(
            id = id,
            title = title,
            description = description,
            ownerId = owner.id,
            projectId = projectId,
            status = status,
            phases = phases.map { phase ->
                PhaseView(
                    id = phase.id,
                    name = phase.name,
                    assigneeId = phase.assignee.id,
                    status = phase.status,
                    kind = phase.kind,
                    tasks = phase.tasks.map { task ->
                        TaskView(
                            id = task.id,
                            title = task.title,
                            assigneeId = task.assignee?.id,
                            status = task.status,
                        )
                    },
                )
            },
        )
    }
}
