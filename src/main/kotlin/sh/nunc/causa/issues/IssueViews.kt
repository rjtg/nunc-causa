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

data class IssueFacetView(
    val id: String,
    val count: Long,
)

data class IssueFacetBundle(
    val owners: List<IssueFacetView>,
    val assignees: List<IssueFacetView>,
    val projects: List<IssueFacetView>,
    val statuses: List<IssueFacetView>,
    val phaseKinds: List<IssueFacetView>,
)

data class IssueDetailView(
    val id: String,
    val title: String,
    val description: String,
    val ownerId: String,
    val projectId: String?,
    val status: String,
    val deadline: String?,
    val phases: List<PhaseView>,
)

data class PhaseView(
    val id: String,
    val name: String,
    val assigneeId: String,
    val status: String,
    val kind: String?,
    val completionComment: String?,
    val completionArtifactUrl: String?,
    val deadline: String?,
    val tasks: List<TaskView>,
)

data class TaskView(
    val id: String,
    val title: String,
    val assigneeId: String?,
    val status: String,
    val startDate: String?,
    val dueDate: String?,
    val dependencies: List<TaskDependencyView>,
)

data class TaskDependencyView(
    val type: String,
    val targetId: String,
)
