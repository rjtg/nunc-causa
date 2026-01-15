package sh.nunc.causa.web.issues

import sh.nunc.causa.issues.IssueDetailView
import sh.nunc.causa.issues.IssueListView
import sh.nunc.causa.issues.IssueFacetBundle
import sh.nunc.causa.issues.IssueFacetView
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.PhaseView
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.issues.TaskView
import sh.nunc.causa.web.model.ActionDecision
import sh.nunc.causa.web.model.IssueDetail
import sh.nunc.causa.web.model.IssueFacetOption
import sh.nunc.causa.web.model.IssueFacetResponse
import sh.nunc.causa.web.model.IssueListItem
import sh.nunc.causa.web.model.IssueStatus as ApiIssueStatus
import sh.nunc.causa.web.model.PhaseKind
import sh.nunc.causa.web.model.PhaseResponse
import sh.nunc.causa.web.model.PhaseStatus as ApiPhaseStatus
import sh.nunc.causa.web.model.TaskResponse
import sh.nunc.causa.web.model.TaskStatus as ApiTaskStatus
import sh.nunc.causa.web.model.TaskDependency as ApiTaskDependency
import java.net.URI

interface IssueActionProvider {
    fun issueActions(issue: IssueDetailView): Map<String, ActionDecision>
    fun phaseActions(issue: IssueDetailView, phaseId: String): Map<String, ActionDecision>
    fun taskActions(issue: IssueDetailView, phaseId: String, taskId: String): Map<String, ActionDecision>
}

fun IssueDetailView.toDetail(actions: IssueActionProvider): IssueDetail {
    return IssueDetail(
        id = id,
        title = title,
        description = description,
        ownerId = ownerId,
        projectId = projectId,
        phases = phases.map { it.toResponse(this, actions) },
        status = status.toIssueStatusEnum(),
        version = 0,
        allowedActions = actions.issueActions(this),
    )
}

fun IssueListView.toListItem(): IssueListItem {
    return IssueListItem(
        id = id,
        title = title,
        description = description,
        ownerId = ownerId,
        projectId = projectId,
        phaseCount = phaseCount.toInt(),
        status = status.toIssueStatusEnum(),
    )
}

fun IssueFacetBundle.toFacetResponse(): IssueFacetResponse {
    return IssueFacetResponse(
        owners = owners.map { it.toOption() },
        assignees = assignees.map { it.toOption() },
        projects = projects.map { it.toOption() },
        statuses = statuses.map { it.toOption() },
        phaseKinds = phaseKinds.map { it.toOption() },
    )
}

private fun IssueFacetView.toOption(): IssueFacetOption {
    return IssueFacetOption(
        id = id,
        count = count.toInt(),
    )
}

private fun PhaseView.toResponse(issue: IssueDetailView, actions: IssueActionProvider): PhaseResponse {
    return PhaseResponse(
        id = id,
        name = name,
        assigneeId = assigneeId,
        status = status.toPhaseStatusEnum(),
        kind = kind?.let { PhaseKind.valueOf(it) },
        completionComment = completionComment,
        completionArtifactUrl = completionArtifactUrl?.let { URI.create(it) },
        tasks = tasks.map { it.toResponse(issue, id, actions) },
        allowedActions = actions.phaseActions(issue, id),
    )
}

private fun TaskView.toResponse(
    issue: IssueDetailView,
    phaseId: String,
    actions: IssueActionProvider,
): TaskResponse {
    return TaskResponse(
        id = id,
        title = title,
        assigneeId = assigneeId,
        status = status.toTaskStatusEnum(),
        startDate = startDate?.let { java.time.LocalDate.parse(it) },
        dueDate = dueDate?.let { java.time.LocalDate.parse(it) },
        dependencies = dependencies.map {
            ApiTaskDependency(
                type = ApiTaskDependency.Type.valueOf(it.type),
                targetId = it.targetId,
            )
        },
        allowedActions = actions.taskActions(issue, phaseId, id),
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
        TaskStatus.PAUSED -> ApiTaskStatus.PAUSED
        TaskStatus.ABANDONED -> ApiTaskStatus.ABANDONED
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
