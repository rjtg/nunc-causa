package sh.nunc.causa.issues

data class CreateIssueCommand(
    val title: String,
    val ownerId: String,
    val projectId: String?,
    val phases: List<CreatePhaseCommand>,
)

data class CreatePhaseCommand(
    val name: String,
    val assigneeId: String,
    val kind: String?,
)
