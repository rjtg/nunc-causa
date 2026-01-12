package sh.nunc.causa.web.issues

import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.PhaseEntity
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskEntity
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.web.model.IssueResponse
import sh.nunc.causa.web.model.IssueSummary
import sh.nunc.causa.web.model.PhaseResponse
import sh.nunc.causa.web.model.TaskResponse

fun IssueEntity.toResponse(): IssueResponse {
    return IssueResponse(
        id = id,
        title = title,
        owner = owner.id,
        projectId = projectId,
        phases = phases.map { it.toResponse() },
        version = 0,
    )
}

fun IssueEntity.toSummary(): IssueSummary {
    return IssueSummary(
        id = id,
        title = title,
        owner = owner.id,
        projectId = projectId,
        phaseCount = phases.size,
        status = status.toIssueStatusEnum(),
    )
}

private fun PhaseEntity.toResponse(): PhaseResponse {
    return PhaseResponse(
        id = id,
        name = name,
        assignee = assignee.id,
        status = status.toPhaseStatusEnum(),
        tasks = tasks.map { it.toResponse() },
    )
}

private fun TaskEntity.toResponse(): TaskResponse {
    return TaskResponse(
        id = id,
        title = title,
        assignee = assignee?.id,
        status = status.toTaskStatusEnum(),
    )
}

private fun String.toPhaseStatusEnum(): PhaseResponse.Status {
    return when (PhaseStatus.valueOf(this)) {
        PhaseStatus.NOT_STARTED -> PhaseResponse.Status.NOT_STARTED
        PhaseStatus.IN_PROGRESS -> PhaseResponse.Status.IN_PROGRESS
        PhaseStatus.DONE -> PhaseResponse.Status.DONE
    }
}

private fun String.toTaskStatusEnum(): TaskResponse.Status {
    return when (TaskStatus.valueOf(this)) {
        TaskStatus.NOT_STARTED -> TaskResponse.Status.NOT_STARTED
        TaskStatus.IN_PROGRESS -> TaskResponse.Status.IN_PROGRESS
        TaskStatus.DONE -> TaskResponse.Status.DONE
    }
}

private fun String.toIssueStatusEnum(): IssueSummary.Status {
    return when (PhaseStatus.valueOf(this)) {
        PhaseStatus.NOT_STARTED -> IssueSummary.Status.NOT_STARTED
        PhaseStatus.IN_PROGRESS -> IssueSummary.Status.IN_PROGRESS
        PhaseStatus.DONE -> IssueSummary.Status.DONE
    }
}
