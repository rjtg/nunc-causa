package sh.nunc.causa.issues

data class Phase(
    val id: String,
    val name: String,
    val assignee: String,
    val status: PhaseStatus,
    val tasks: List<Task>,
)

enum class PhaseStatus {
    NOT_STARTED,
    IN_PROGRESS,
    DONE,
}

data class Task(
    val id: String,
    val title: String,
    val assignee: String?,
    val status: TaskStatus,
)

enum class TaskStatus {
    NOT_STARTED,
    IN_PROGRESS,
    DONE,
}
