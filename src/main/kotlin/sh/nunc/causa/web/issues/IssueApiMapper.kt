package sh.nunc.causa.web.issues

import sh.nunc.causa.issues.Issue
import sh.nunc.causa.issues.Phase
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.Task
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.web.model.IssueResponse
import sh.nunc.causa.web.model.IssueSummary
import sh.nunc.causa.web.model.PhaseResponse
import sh.nunc.causa.web.model.TaskResponse

fun Issue.toResponse(): IssueResponse {
    return IssueResponse(
        id = id.value,
        title = title,
        owner = owner,
        projectId = projectId,
        phases = phases.map { it.toResponse() },
        version = version,
    )
}

fun Issue.toSummary(): IssueSummary {
    return IssueSummary(
        id = id.value,
        title = title,
        owner = owner,
        projectId = projectId,
        phaseCount = phases.size,
        status = phases.toIssueStatus().toIssueStatusEnum(),
    )
}

private fun List<Phase>.toIssueStatus(): PhaseStatus {
    if (isEmpty()) return PhaseStatus.NOT_STARTED
    return when {
        all { it.status == PhaseStatus.DONE } -> PhaseStatus.DONE
        all { it.status == PhaseStatus.NOT_STARTED } -> PhaseStatus.NOT_STARTED
        else -> PhaseStatus.IN_PROGRESS
    }
}

private fun Phase.toResponse(): PhaseResponse {
    return PhaseResponse(
        id = id,
        name = name,
        assignee = assignee,
        status = status.toPhaseStatusEnum(),
        tasks = tasks.map { it.toResponse() },
    )
}

private fun Task.toResponse(): TaskResponse {
    return TaskResponse(
        id = id,
        title = title,
        assignee = assignee,
        status = status.toTaskStatusEnum(),
    )
}

private fun PhaseStatus.toPhaseStatusEnum(): PhaseResponse.Status {
    return when (this) {
        PhaseStatus.NOT_STARTED -> PhaseResponse.Status.NOT_STARTED
        PhaseStatus.IN_PROGRESS -> PhaseResponse.Status.IN_PROGRESS
        PhaseStatus.DONE -> PhaseResponse.Status.DONE
    }
}

private fun TaskStatus.toTaskStatusEnum(): TaskResponse.Status {
    return when (this) {
        TaskStatus.NOT_STARTED -> TaskResponse.Status.NOT_STARTED
        TaskStatus.IN_PROGRESS -> TaskResponse.Status.IN_PROGRESS
        TaskStatus.DONE -> TaskResponse.Status.DONE
    }
}

private fun PhaseStatus.toIssueStatusEnum(): IssueSummary.Status {
    return when (this) {
        PhaseStatus.NOT_STARTED -> IssueSummary.Status.NOT_STARTED
        PhaseStatus.IN_PROGRESS -> IssueSummary.Status.IN_PROGRESS
        PhaseStatus.DONE -> IssueSummary.Status.DONE
    }
}
