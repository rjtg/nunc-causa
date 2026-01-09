package sh.nunc.causa.issues

data class Issue(
    val id: IssueId,
    val title: String,
    val owner: String,
    val projectId: String?,
    val phases: List<Phase>,
    val version: Long,
) {
    companion object {
        fun rehydrate(history: List<IssueEventEnvelope>): Issue {
            require(history.isNotEmpty()) { "Issue history cannot be empty" }

            var issueId: IssueId? = null
            var title = ""
            var owner = ""
            var projectId: String? = null
            val phases = mutableListOf<Phase>()
            var version = 0L

            history.sortedBy { it.sequence }.forEach { envelope ->
                when (val event = envelope.event) {
                    is IssueCreated -> {
                        issueId = IssueId(event.issueId)
                        title = event.title
                        owner = event.owner
                        projectId = event.projectId
                    }
                    is PhaseAdded -> {
                        phases.add(
                            Phase(
                                id = event.phaseId,
                                name = event.name,
                                assignee = event.assignee,
                                status = event.status,
                                tasks = emptyList(),
                            ),
                        )
                    }
                    is IssueOwnerAssigned -> {
                        owner = event.owner
                    }
                    is PhaseAssigneeAssigned -> {
                        val index = phases.indexOfFirst { it.id == event.phaseId }
                        if (index >= 0) {
                            val phase = phases[index]
                            phases[index] = phase.copy(assignee = event.assignee)
                        }
                    }
                    is TaskAdded -> {
                        val index = phases.indexOfFirst { it.id == event.phaseId }
                        if (index >= 0) {
                            val phase = phases[index]
                            phases[index] = phase.copy(
                                tasks = phase.tasks + Task(
                                    id = event.taskId,
                                    title = event.title,
                                    assignee = event.assignee,
                                    status = event.status,
                                ),
                            )
                        }
                    }
                }
                version = envelope.sequence
            }

            return Issue(
                id = issueId ?: error("IssueCreated event is required to rebuild Issue"),
                title = title,
                owner = owner,
                projectId = projectId,
                phases = phases.toList(),
                version = version,
            )
        }
    }
}
