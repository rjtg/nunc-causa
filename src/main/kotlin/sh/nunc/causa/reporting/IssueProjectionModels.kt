package sh.nunc.causa.reporting

import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus

data class IssueProjection(
    val id: String,
    val title: String,
    val owner: String,
    val projectId: String?,
    val status: PhaseStatus,
    val phaseCount: Int,
    val version: Long,
    val phases: List<PhaseProjection>,
)

data class PhaseProjection(
    val id: String,
    val name: String,
    val assignee: String,
    val status: PhaseStatus,
    val tasks: List<TaskProjection>,
)

data class TaskProjection(
    val id: String,
    val title: String,
    val assignee: String?,
    val status: TaskStatus,
)
