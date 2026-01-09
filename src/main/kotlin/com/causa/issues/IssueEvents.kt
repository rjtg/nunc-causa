package com.causa.issues

sealed interface IssueEvent {
    val issueId: String
}

data class IssueCreated(
    override val issueId: String,
    val title: String,
    val owner: String,
) : IssueEvent

data class PhaseAdded(
    override val issueId: String,
    val phaseId: String,
    val name: String,
    val assignee: String,
    val status: PhaseStatus,
) : IssueEvent

data class IssueEventEnvelope(
    val sequence: Long,
    val event: IssueEvent,
)
