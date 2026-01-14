package sh.nunc.causa.issues

data class IssueListView(
    val id: String,
    val title: String,
    val description: String,
    val ownerId: String,
    val projectId: String?,
    val phaseCount: Long,
    val status: String,
)

data class IssueDetailView(
    val id: String,
    val title: String,
    val description: String,
    val ownerId: String,
    val projectId: String?,
    val status: String,
    val phases: List<PhaseView>,
)

data class PhaseView(
    val id: String,
    val name: String,
    val assigneeId: String,
    val status: String,
    val kind: String?,
    val tasks: List<TaskView>,
)

data class TaskView(
    val id: String,
    val title: String,
    val assigneeId: String?,
    val status: String,
)
