package sh.nunc.causa.issues

object IssueEventTypes {
    val all = listOf(
        IssueCreated::class.simpleName,
        PhaseAdded::class.simpleName,
        IssueOwnerAssigned::class.simpleName,
        PhaseAssigneeAssigned::class.simpleName,
        TaskAdded::class.simpleName,
    ).mapNotNull { it }
}
