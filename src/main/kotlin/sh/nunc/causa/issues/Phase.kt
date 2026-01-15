package sh.nunc.causa.issues

enum class PhaseStatus {
    NOT_STARTED,
    IN_PROGRESS,
    FAILED,
    DONE,
}

enum class TaskStatus {
    NOT_STARTED,
    IN_PROGRESS,
    PAUSED,
    ABANDONED,
    DONE,
}

enum class TaskDependencyType {
    TASK,
    PHASE,
    ISSUE,
}

enum class IssueStatus {
    CREATED,
    NOT_ACTIVE,
    IN_ANALYSIS,
    IN_DEVELOPMENT,
    IN_TEST,
    IN_ROLLOUT,
    DONE,
    FAILED,
}
