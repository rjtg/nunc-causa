package sh.nunc.causa.issues

data class MyWorkView(
    val ownedIssues: List<IssueListView>,
    val assignedPhases: List<PhaseWorkView>,
    val assignedTasks: List<TaskWorkView>,
)

data class PhaseWorkView(
    val issueId: String,
    val phaseId: String,
    val phaseName: String,
    val status: String,
)

data class TaskWorkView(
    val issueId: String,
    val phaseId: String,
    val taskId: String,
    val taskTitle: String,
    val status: String,
)
