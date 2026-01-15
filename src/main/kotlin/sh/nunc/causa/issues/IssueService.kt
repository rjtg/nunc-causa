package sh.nunc.causa.issues

import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository
import java.time.LocalDate
import java.util.UUID

@Service
class IssueService(
    private val issueRepository: IssueRepository,
    private val issueCounterRepository: IssueCounterRepository,
    private val projectRepository: sh.nunc.causa.tenancy.ProjectRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val userRepository: UserRepository,
    private val historyService: IssueHistoryService,
    private val currentUserService: CurrentUserService,
    private val searchService: IssueSearchService,
) {
    @Transactional
    fun createIssue(command: CreateIssueCommand): IssueEntity {
        val owner = requireUser(command.ownerId)
        val projectId = command.projectId ?: throw IllegalArgumentException("Project id is required")
        val project = projectRepository.findById(projectId)
            .orElseThrow { NoSuchElementException("Project $projectId not found") }
        val counterResult = issueCounterRepository.findById(projectId)
        val counter = counterResult.orElse(IssueCounterEntity(projectId = projectId, nextNumber = 1))
        val issueNumber = counter.nextNumber
        counter.nextNumber = issueNumber + 1
        if (counterResult.isEmpty) {
            issueCounterRepository.save(counter)
        }
        val issueId = "${project.key}-${issueNumber}"
        val issue = IssueEntity(
            id = issueId,
            title = command.title,
            description = command.description,
            owner = owner,
            projectId = projectId,
            issueNumber = issueNumber,
            status = IssueStatus.CREATED.name,
            deadline = command.deadline,
        )

        command.phases.forEach { phaseCommand ->
            ensurePhaseDeadlineWithinIssue(issue, phaseCommand.deadline)
            val assignee = requireUser(phaseCommand.assigneeId)
            val phase = PhaseEntity(
                id = UUID.randomUUID().toString(),
                name = phaseCommand.name,
                assignee = assignee,
                status = PhaseStatus.NOT_STARTED.name,
                kind = phaseCommand.kind,
                deadline = phaseCommand.deadline,
                issue = issue,
            )
            issue.phases.add(phase)
        }

        applyIssueDeadlineConstraints(issue)
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
        val results = searchService.searchIssues(
            IssueSearchFilters(
                query = query,
                ownerId = ownerId,
                assigneeId = assigneeId,
                memberId = memberId,
                projectId = projectId,
                status = status?.name,
                phaseKind = phaseKind,
            ),
        )
        return results.map { issue ->
            val statusCounts = issue.phases
                .groupingBy { it.status }
                .eachCount()
                .mapValues { it.value.toLong() }
            val phaseProgress = issue.phases.map { phase ->
                val taskStatusCounts = phase.tasks
                    .groupingBy { it.status }
                    .eachCount()
                    .mapValues { it.value.toLong() }
                PhaseProgressView(
                    phaseId = phase.id,
                    phaseName = phase.name,
                    assigneeId = phase.assignee.id,
                    status = phase.status,
                    taskStatusCounts = taskStatusCounts,
                    taskTotal = phase.tasks.size.toLong(),
                )
            }
            IssueListView(
                id = issue.id,
                title = issue.title,
                description = issue.description,
                ownerId = issue.owner.id,
                projectId = issue.projectId,
                phaseCount = issue.phases.size.toLong(),
                phaseStatusCounts = statusCounts,
                phaseProgress = phaseProgress,
                status = issue.status,
            )
        }
    }

    @Transactional(readOnly = true)
    fun getIssueFacets(
        query: String?,
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: IssueStatus?,
        phaseKind: String?,
    ): IssueFacetBundle {
        return searchService.facetIssues(
            IssueSearchFilters(
                query = query,
                ownerId = ownerId,
                assigneeId = assigneeId,
                memberId = memberId,
                projectId = projectId,
                status = status?.name,
                phaseKind = phaseKind,
            ),
        )
    }

    @Transactional
    fun updateIssue(
        issueId: String,
        title: String?,
        ownerId: String?,
        projectId: String?,
        description: String?,
        deadline: java.time.LocalDate?,
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
            if (issue.projectId != null && issue.projectId != projectId) {
                throw IllegalStateException("Cannot move issue between projects")
            }
            issue.projectId = projectId
        }
        if (deadline != null) {
            issue.deadline = deadline
        }
        if (deadline != null) {
            applyIssueDeadlineConstraints(issue)
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
    fun addPhase(issueId: String, name: String, assigneeId: String, kind: String?, deadline: java.time.LocalDate?): IssueEntity {
        val issue = getIssue(issueId)
        ensurePhaseDeadlineWithinIssue(issue, deadline)
        val assigneeEntity = requireUser(assigneeId)
        val phase = PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            assignee = assigneeEntity,
            status = PhaseStatus.NOT_STARTED.name,
            kind = kind,
            deadline = deadline,
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
        completionComment: String?,
        completionArtifactUrl: String?,
        kind: String?,
        deadline: java.time.LocalDate?,
    ): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val previousStatus = PhaseStatus.valueOf(phase.status)
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
            if (status == PhaseStatus.DONE) {
                if (completionComment.isNullOrBlank()) {
                    throw IllegalStateException("Phase $phaseId completion comment required")
                }
                phase.completionComment = completionComment.trim()
                phase.completionArtifactUrl = completionArtifactUrl?.trim()?.ifBlank { null }
            } else {
                phase.completionComment = null
                phase.completionArtifactUrl = null
            }
            phase.status = status.name
        }
        if (completionComment != null || completionArtifactUrl != null) {
            val isDone = PhaseStatus.valueOf(phase.status) == PhaseStatus.DONE
            if (!isDone) {
                throw IllegalStateException("Phase $phaseId must be done to store completion details")
            }
            if (completionComment.isNullOrBlank()) {
                throw IllegalStateException("Phase $phaseId completion comment required")
            }
            phase.completionComment = completionComment.trim()
            phase.completionArtifactUrl = completionArtifactUrl?.trim()?.ifBlank { null }
        }
        if (kind != null) {
            phase.kind = kind
        }
        if (deadline != null) {
            ensurePhaseDeadlineWithinIssue(issue, deadline)
            phase.deadline = deadline
        }
        if (deadline != null) {
            clampTaskDeadlines(issue, phase)
        }
        issue.status = deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        val nextStatus = PhaseStatus.valueOf(phase.status)
        if (previousStatus != PhaseStatus.DONE && nextStatus == PhaseStatus.DONE) {
            recordActivity(saved.id, "PHASE_COMPLETED", "Phase completed")
        } else {
            recordActivity(saved.id, "PHASE_UPDATED", "Phase updated")
        }
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
    fun addTask(
        issueId: String,
        phaseId: String,
        title: String,
        assigneeId: String?,
        startDate: java.time.LocalDate?,
        dueDate: java.time.LocalDate?,
        dependencies: List<TaskDependencyView>?,
    ): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val dependencyViews = dependencies.orEmpty()
        validateTaskDates(issue, phase, startDate, dueDate, dependencyViews)
        val assigneeEntity = assigneeId?.let { requireUser(it) }
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title,
            assignee = assigneeEntity,
            status = TaskStatus.NOT_STARTED.name,
            startDate = startDate,
            dueDate = dueDate,
            phase = phase,
        )
        dependencyViews.forEach { dependency ->
            task.dependencies.add(
                TaskDependencyEntity(
                    id = UUID.randomUUID().toString(),
                    task = task,
                    type = dependency.type,
                    targetId = dependency.targetId,
                ),
            )
        }
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
        startDate: java.time.LocalDate?,
        dueDate: java.time.LocalDate?,
        dependencies: List<TaskDependencyView>?,
    ): IssueEntity {
        val issue = getIssue(issueId)
        val phase = issue.phases.firstOrNull { it.id == phaseId }
            ?: throw NoSuchElementException("Phase $phaseId not found")
        val task = phase.tasks.firstOrNull { it.id == taskId }
            ?: throw NoSuchElementException("Task $taskId not found")
        val effectiveDependencies = dependencies ?: task.dependencies.map {
            TaskDependencyView(type = it.type, targetId = it.targetId)
        }
        val effectiveStartDate = startDate ?: task.startDate
        val effectiveDueDate = dueDate ?: task.dueDate
        validateTaskDates(issue, phase, effectiveStartDate, effectiveDueDate, effectiveDependencies)
        if (title != null) {
            task.title = title
        }
        if (assigneeId != null) {
            task.assignee = requireUser(assigneeId)
        }
        if (status != null) {
            task.status = status.name
        }
        if (startDate != null) {
            task.startDate = startDate
        }
        if (dueDate != null) {
            task.dueDate = dueDate
        }
        if (dependencies != null) {
            task.dependencies.clear()
            dependencies.forEach { dependency ->
                task.dependencies.add(
                    TaskDependencyEntity(
                        id = UUID.randomUUID().toString(),
                        task = task,
                        type = dependency.type,
                        targetId = dependency.targetId,
                    ),
                )
            }
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
        recordActivity(saved.id, "ISSUE_ABANDONED", "Issue abandoned")
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
        val results = searchService.searchIssues(
            IssueSearchFilters(query = query, projectId = projectId),
        )
        return results.map { issue ->
            val statusCounts = issue.phases
                .groupingBy { it.status }
                .eachCount()
                .mapValues { it.value.toLong() }
            val phaseProgress = issue.phases.map { phase ->
                val taskStatusCounts = phase.tasks
                    .groupingBy { it.status }
                    .eachCount()
                    .mapValues { it.value.toLong() }
                PhaseProgressView(
                    phaseId = phase.id,
                    phaseName = phase.name,
                    assigneeId = phase.assignee.id,
                    status = phase.status,
                    taskStatusCounts = taskStatusCounts,
                    taskTotal = phase.tasks.size.toLong(),
                )
            }
            IssueListView(
                id = issue.id,
                title = issue.title,
                description = issue.description,
                ownerId = issue.owner.id,
                projectId = issue.projectId,
                phaseCount = issue.phases.size.toLong(),
                phaseStatusCounts = statusCounts,
                phaseProgress = phaseProgress,
                status = issue.status,
            )
        }
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
            val statusCounts = issue.phases
                .groupingBy { it.status }
                .eachCount()
                .mapValues { it.value.toLong() }
            val phaseProgress = issue.phases.map { phase ->
                val taskStatusCounts = phase.tasks
                    .groupingBy { it.status }
                    .eachCount()
                    .mapValues { it.value.toLong() }
                PhaseProgressView(
                    phaseId = phase.id,
                    phaseName = phase.name,
                    assigneeId = phase.assignee.id,
                    status = phase.status,
                    taskStatusCounts = taskStatusCounts,
                    taskTotal = phase.tasks.size.toLong(),
                )
            }
            IssueListView(
                id = issue.id,
                title = issue.title,
                description = issue.description,
                ownerId = issue.owner.id,
                projectId = issue.projectId,
                phaseCount = issue.phases.size.toLong(),
                phaseStatusCounts = statusCounts,
                phaseProgress = phaseProgress,
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
            deadline = deadline?.toString(),
            phases = phases.map { phase ->
                PhaseView(
                    id = phase.id,
                    name = phase.name,
                    assigneeId = phase.assignee.id,
                    status = phase.status,
                    kind = phase.kind,
                    completionComment = phase.completionComment,
                    completionArtifactUrl = phase.completionArtifactUrl,
                    deadline = phase.deadline?.toString(),
                    tasks = phase.tasks.map { task ->
                        TaskView(
                            id = task.id,
                            title = task.title,
                            assigneeId = task.assignee?.id,
                            status = task.status,
                            startDate = task.startDate?.toString(),
                            dueDate = task.dueDate?.toString(),
                            dependencies = task.dependencies.map {
                                TaskDependencyView(
                                    type = it.type,
                                    targetId = it.targetId,
                                )
                            },
                        )
                    },
                )
            },
        )
    }

    private fun ensurePhaseDeadlineWithinIssue(issue: IssueEntity, deadline: LocalDate?) {
        val issueDeadline = issue.deadline ?: return
        if (deadline != null && deadline.isAfter(issueDeadline)) {
            throw IllegalStateException("Phase deadline exceeds issue deadline")
        }
    }

    private fun applyIssueDeadlineConstraints(issue: IssueEntity) {
        val issueDeadline = issue.deadline ?: return
        issue.phases.forEach { phase ->
            if (phase.deadline != null && phase.deadline!!.isAfter(issueDeadline)) {
                phase.deadline = issueDeadline
            }
            clampTaskDeadlines(issue, phase)
        }
    }

    private fun clampTaskDeadlines(issue: IssueEntity, phase: PhaseEntity) {
        val limit = listOfNotNull(issue.deadline, phase.deadline).minOrNull() ?: return
        phase.tasks.forEach { task ->
            if (task.dueDate != null && task.dueDate!!.isAfter(limit)) {
                task.dueDate = limit
            }
            if (task.startDate != null && task.dueDate != null && task.startDate!!.isAfter(task.dueDate)) {
                task.startDate = task.dueDate
            }
        }
    }

    private fun validateTaskDates(
        issue: IssueEntity,
        phase: PhaseEntity,
        startDate: LocalDate?,
        dueDate: LocalDate?,
        dependencies: List<TaskDependencyView>,
    ) {
        if (startDate != null && dueDate != null && startDate.isAfter(dueDate)) {
            throw IllegalStateException("Task start date must be before due date")
        }
        val maxDeadline = listOfNotNull(issue.deadline, phase.deadline).minOrNull()
        if (dueDate != null && maxDeadline != null && dueDate.isAfter(maxDeadline)) {
            throw IllegalStateException("Task due date exceeds deadline")
        }
        if (startDate != null) {
            dependencies.forEach { dependency ->
                val finishDate = resolveDependencyFinishDate(issue, dependency)
                if (finishDate != null && startDate.isBefore(finishDate)) {
                    throw IllegalStateException("Task start date precedes dependency completion")
                }
            }
        }
    }

    private fun resolveDependencyFinishDate(issue: IssueEntity, dependency: TaskDependencyView): LocalDate? {
        val targetId = dependency.targetId
        val type = TaskDependencyType.valueOf(dependency.type)
        return when (type) {
            TaskDependencyType.TASK -> {
                val task = issue.phases.asSequence()
                    .flatMap { it.tasks.asSequence() }
                    .firstOrNull { it.id == targetId }
                    ?: throw NoSuchElementException("Task dependency $targetId not found")
                task.dueDate ?: task.phase.deadline ?: issue.deadline
            }
            TaskDependencyType.PHASE -> {
                val phase = issue.phases.firstOrNull { it.id == targetId }
                    ?: throw NoSuchElementException("Phase dependency $targetId not found")
                phase.deadline ?: issue.deadline
            }
            TaskDependencyType.ISSUE -> issue.deadline
        }
    }
}
