package sh.nunc.causa.web.issues

import sh.nunc.causa.issues.IssueEntity
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseEntity
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskEntity
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.web.model.IssueDetail
import sh.nunc.causa.web.model.IssueListItem
import sh.nunc.causa.web.model.IssueStatus as ApiIssueStatus
import sh.nunc.causa.web.model.PhaseKind
import sh.nunc.causa.web.model.PhaseResponse
import sh.nunc.causa.web.model.PhaseStatus as ApiPhaseStatus
import sh.nunc.causa.web.model.TaskResponse
import sh.nunc.causa.web.model.TaskStatus as ApiTaskStatus

fun IssueEntity.toDetail(): IssueDetail {
    return IssueDetail(
        id = id,
        title = title,
        ownerId = owner.id,
        projectId = projectId,
        phases = phases.map { it.toResponse() },
        status = status.toIssueStatusEnum(),
        version = 0,
    )
}

fun IssueEntity.toListItem(): IssueListItem {
    return IssueListItem(
        id = id,
        title = title,
        ownerId = owner.id,
        projectId = projectId,
        phaseCount = phases.size,
        status = status.toIssueStatusEnum(),
    )
}

private fun PhaseEntity.toResponse(): PhaseResponse {
    return PhaseResponse(
        id = id,
        name = name,
        assigneeId = assignee.id,
        status = status.toPhaseStatusEnum(),
        kind = kind?.let { PhaseKind.valueOf(it) },
        tasks = tasks.map { it.toResponse() },
    )
}

private fun TaskEntity.toResponse(): TaskResponse {
    return TaskResponse(
        id = id,
        title = title,
        assigneeId = assignee?.id,
        status = status.toTaskStatusEnum(),
    )
}

private fun String.toPhaseStatusEnum(): ApiPhaseStatus {
    return when (PhaseStatus.valueOf(this)) {
        PhaseStatus.NOT_STARTED -> ApiPhaseStatus.NOT_STARTED
        PhaseStatus.IN_PROGRESS -> ApiPhaseStatus.IN_PROGRESS
        PhaseStatus.FAILED -> ApiPhaseStatus.FAILED
        PhaseStatus.DONE -> ApiPhaseStatus.DONE
    }
}

private fun String.toTaskStatusEnum(): ApiTaskStatus {
    return when (TaskStatus.valueOf(this)) {
        TaskStatus.NOT_STARTED -> ApiTaskStatus.NOT_STARTED
        TaskStatus.IN_PROGRESS -> ApiTaskStatus.IN_PROGRESS
        TaskStatus.DONE -> ApiTaskStatus.DONE
    }
}

private fun String.toIssueStatusEnum(): ApiIssueStatus {
    return when (IssueStatus.valueOf(this)) {
        IssueStatus.CREATED -> ApiIssueStatus.CREATED
        IssueStatus.IN_ANALYSIS -> ApiIssueStatus.IN_ANALYSIS
        IssueStatus.IN_DEVELOPMENT -> ApiIssueStatus.IN_DEVELOPMENT
        IssueStatus.IN_TEST -> ApiIssueStatus.IN_TEST
        IssueStatus.IN_ROLLOUT -> ApiIssueStatus.IN_ROLLOUT
        IssueStatus.DONE -> ApiIssueStatus.DONE
        IssueStatus.FAILED -> ApiIssueStatus.FAILED
    }
}
