package sh.nunc.causa.web.issues

import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.reporting.IssueProjection
import sh.nunc.causa.reporting.PhaseProjection
import sh.nunc.causa.reporting.TaskProjection
import sh.nunc.causa.web.model.IssueResponse
import sh.nunc.causa.web.model.IssueSummary
import sh.nunc.causa.web.model.PhaseResponse
import sh.nunc.causa.web.model.TaskResponse

fun IssueProjection.toResponse(): IssueResponse {
    return IssueResponse(
        id = id,
        title = title,
        owner = owner,
        projectId = projectId,
        phases = phases.map { it.toResponse() },
        version = version,
    )
}

fun IssueProjection.toSummary(): IssueSummary {
    return IssueSummary(
        id = id,
        title = title,
        owner = owner,
        projectId = projectId,
        phaseCount = phaseCount,
        status = status.toIssueStatusEnum(),
    )
}

private fun PhaseProjection.toResponse(): PhaseResponse {
    return PhaseResponse(
        id = id,
        name = name,
        assignee = assignee,
        status = status.toPhaseStatusEnum(),
        tasks = tasks.map { it.toResponse() },
    )
}

private fun TaskProjection.toResponse(): TaskResponse {
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
