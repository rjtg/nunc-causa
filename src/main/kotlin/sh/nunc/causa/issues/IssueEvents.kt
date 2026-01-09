package sh.nunc.causa.issues

sealed interface IssueEvent {
    val issueId: String
}

data class IssueCreated(
    override val issueId: String,
    val title: String,
    val owner: String,
    val projectId: String?,
) : IssueEvent

data class PhaseAdded(
    override val issueId: String,
    val phaseId: String,
    val name: String,
    val assignee: String,
    val status: PhaseStatus,
) : IssueEvent

data class IssueOwnerAssigned(
    override val issueId: String,
    val owner: String,
) : IssueEvent

data class PhaseAssigneeAssigned(
    override val issueId: String,
    val phaseId: String,
    val assignee: String,
) : IssueEvent

data class TaskAdded(
    override val issueId: String,
    val phaseId: String,
    val taskId: String,
    val title: String,
    val assignee: String?,
    val status: TaskStatus,
) : IssueEvent

data class IssueEventEnvelope(
    val sequence: Long,
    val event: IssueEvent,
)
