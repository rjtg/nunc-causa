package sh.nunc.causa.issues

import java.time.LocalDate
import org.springframework.stereotype.Service

@Service
class IssueDeadlineService {
    fun ensurePhaseDeadlineWithinIssue(issue: IssueEntity, deadline: LocalDate?) {
        val issueDeadline = issue.deadline ?: return
        if (deadline != null && deadline.isAfter(issueDeadline)) {
            throw IllegalStateException("Phase deadline exceeds issue deadline")
        }
    }

    fun applyIssueDeadlineConstraints(issue: IssueEntity) {
        val issueDeadline = issue.deadline ?: return
        issue.phases.forEach { phase ->
            if (phase.deadline != null && phase.deadline!!.isAfter(issueDeadline)) {
                phase.deadline = issueDeadline
            }
            clampTaskDeadlines(issue, phase)
        }
    }

    fun clampTaskDeadlines(issue: IssueEntity, phase: PhaseEntity) {
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

    fun validateTaskDates(
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
