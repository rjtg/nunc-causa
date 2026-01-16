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
    private val issueCounterRepository: IssueCounterRepository,
    private val projectRepository: sh.nunc.causa.tenancy.ProjectRepository,
    private val userRepository: UserRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val activityRecorder: IssueActivityRecorder,
    private val deadlineService: IssueDeadlineService,
    private val workflowService: IssueWorkflowService,
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

        if (command.phases.isEmpty()) {
            issue.phases.add(defaultDevelopmentPhase(issue, owner))
        } else {
            command.phases.forEach { phaseCommand ->
                deadlineService.ensurePhaseDeadlineWithinIssue(issue, phaseCommand.deadline)
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
        }

        deadlineService.applyIssueDeadlineConstraints(issue)
        issue.status = workflowService.deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "ISSUE_CREATED", "Issue created")
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
            deadlineService.applyIssueDeadlineConstraints(issue)
        }
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "ISSUE_UPDATED", "Issue updated")
        return saved
    }

    @Transactional
    fun assignOwner(issueId: String, ownerId: String): IssueEntity {
        val issue = getIssue(issueId)
        issue.owner = requireUser(ownerId)
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "OWNER_ASSIGNED", "Issue owner assigned")
        return saved
    }

    @Transactional
    fun backfillMissingPhases() {
        val issues = issueRepository.findWithoutPhases()
        if (issues.isEmpty()) {
            return
        }
        issues.forEach { issue ->
            issue.phases.add(defaultDevelopmentPhase(issue, issue.owner))
            issue.status = workflowService.deriveIssueStatus(issue).name
            issueRepository.save(issue)
        }
    }

    @Transactional
    fun addPhase(issueId: String, name: String, assigneeId: String, kind: String?, deadline: java.time.LocalDate?): IssueEntity {
        val issue = getIssue(issueId)
        deadlineService.ensurePhaseDeadlineWithinIssue(issue, deadline)
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
        issue.status = workflowService.deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "PHASE_ADDED", "Phase added")
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
            deadlineService.ensurePhaseDeadlineWithinIssue(issue, deadline)
            phase.deadline = deadline
        }
        if (deadline != null) {
            deadlineService.clampTaskDeadlines(issue, phase)
        }
        issue.status = workflowService.deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        val nextStatus = PhaseStatus.valueOf(phase.status)
        if (previousStatus != PhaseStatus.DONE && nextStatus == PhaseStatus.DONE) {
            activityRecorder.record(saved.id, "PHASE_COMPLETED", "Phase completed")
        } else {
            activityRecorder.record(saved.id, "PHASE_UPDATED", "Phase updated")
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
        activityRecorder.record(saved.id, "PHASE_ASSIGNEE_CHANGED", "Phase assignee updated")
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
        deadlineService.validateTaskDates(issue, phase, startDate, dueDate, dependencyViews)
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
        issue.status = workflowService.deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "TASK_ADDED", "Task added")
        recordDependencyChanges(
            sourceIssue = saved,
            task = task,
            added = dependencyViews,
            removed = emptyList(),
        )
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
        clearStartDate: Boolean?,
        clearDueDate: Boolean?,
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
        val startCleared = clearStartDate == true
        val dueCleared = clearDueDate == true
        val effectiveStartDate = if (startCleared) null else startDate ?: task.startDate
        val effectiveDueDate = if (dueCleared) null else dueDate ?: task.dueDate
        deadlineService.validateTaskDates(issue, phase, effectiveStartDate, effectiveDueDate, effectiveDependencies)
        if (title != null) {
            task.title = title
        }
        if (assigneeId != null) {
            task.assignee = requireUser(assigneeId)
        }
        if (status != null) {
            task.status = status.name
        }
        if (startCleared) {
            task.startDate = null
        } else if (startDate != null) {
            task.startDate = startDate
        }
        if (dueCleared) {
            task.dueDate = null
        } else if (dueDate != null) {
            task.dueDate = dueDate
        }
        if (dependencies != null) {
            val previousDependencies = task.dependencies.map {
                TaskDependencyView(type = it.type, targetId = it.targetId)
            }
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
            val changes = resolveDependencyChanges(previousDependencies, dependencies)
            recordDependencyChanges(
                sourceIssue = issue,
                task = task,
                added = changes.added,
                removed = changes.removed,
            )
        }
        issue.status = workflowService.deriveIssueStatus(issue).name
        val saved = issueRepository.save(issue)
        eventPublisher.publishEvent(IssueUpdatedEvent(saved.id))
        activityRecorder.record(saved.id, "TASK_UPDATED", "Task updated")
        return saved
    }

    private fun requireUser(userId: String): UserEntity {
        return userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User $userId not found") }
    }

    private fun resolveDependencyChanges(
        previous: List<TaskDependencyView>,
        current: List<TaskDependencyView>,
    ): DependencyChanges {
        val previousKeys = previous.associateBy { dependencyKey(it) }
        val currentKeys = current.associateBy { dependencyKey(it) }
        val added = currentKeys.filterKeys { it !in previousKeys }.values.toList()
        val removed = previousKeys.filterKeys { it !in currentKeys }.values.toList()
        return DependencyChanges(added, removed)
    }

    private fun dependencyKey(dependency: TaskDependencyView) =
        "${dependency.type}:${dependency.targetId}"

    private fun recordDependencyChanges(
        sourceIssue: IssueEntity,
        task: TaskEntity,
        added: List<TaskDependencyView>,
        removed: List<TaskDependencyView>,
    ) {
        added.forEach { dependency ->
            recordDependencyActivity(
                sourceIssue = sourceIssue,
                task = task,
                dependency = dependency,
                type = "DEPENDENCY_ADDED",
                summaryPrefix = "Dependency added",
            )
        }
        removed.forEach { dependency ->
            recordDependencyActivity(
                sourceIssue = sourceIssue,
                task = task,
                dependency = dependency,
                type = "DEPENDENCY_REMOVED",
                summaryPrefix = "Dependency removed",
            )
        }
    }

    private fun recordDependencyActivity(
        sourceIssue: IssueEntity,
        task: TaskEntity,
        dependency: TaskDependencyView,
        type: String,
        summaryPrefix: String,
    ) {
        val targetIssueId = resolveDependencyIssueId(sourceIssue, dependency)
        val targetLabel = "${dependency.type}:${dependency.targetId}"
        val summary = "$summaryPrefix: ${sourceIssue.id} · ${task.title} -> $targetLabel"
        activityRecorder.record(sourceIssue.id, type, summary)
        if (targetIssueId != null && targetIssueId != sourceIssue.id) {
            activityRecorder.record(targetIssueId, type, summary)
        }
    }

    private fun resolveDependencyIssueId(
        sourceIssue: IssueEntity,
        dependency: TaskDependencyView,
    ): String? {
        return when (TaskDependencyType.valueOf(dependency.type)) {
            TaskDependencyType.ISSUE -> dependency.targetId
            TaskDependencyType.PHASE -> {
                if (sourceIssue.phases.any { it.id == dependency.targetId }) {
                    sourceIssue.id
                } else {
                    issueRepository.findIssueIdByPhaseId(dependency.targetId)
                }
            }
            TaskDependencyType.TASK -> {
                val inSource = sourceIssue.phases.any { phase ->
                    phase.tasks.any { it.id == dependency.targetId }
                }
                if (inSource) {
                    sourceIssue.id
                } else {
                    issueRepository.findIssueIdByTaskId(dependency.targetId)
                }
            }
        }
    }

    private data class DependencyChanges(
        val added: List<TaskDependencyView>,
        val removed: List<TaskDependencyView>,
    )

    private fun defaultDevelopmentPhase(issue: IssueEntity, assignee: UserEntity): PhaseEntity {
        return PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = "Development",
            assignee = assignee,
            status = PhaseStatus.NOT_STARTED.name,
            kind = "DEVELOPMENT",
            deadline = null,
            issue = issue,
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

    @Transactional
    fun closeIssue(issueId: String): IssueEntity {
        return workflowService.closeIssue(issueId)
    }

    @Transactional
    fun abandonIssue(issueId: String): IssueEntity {
        return workflowService.abandonIssue(issueId)
    }

    @Transactional
    fun failPhase(issueId: String, phaseId: String): IssueEntity {
        return workflowService.failPhase(issueId, phaseId)
    }

    @Transactional
    fun reopenPhase(issueId: String, phaseId: String): IssueEntity {
        return workflowService.reopenPhase(issueId, phaseId)
    }
}
