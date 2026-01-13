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
    DONE,
}

enum class IssueStatus {
    CREATED,
    IN_ANALYSIS,
    IN_DEVELOPMENT,
    IN_TEST,
    IN_ROLLOUT,
    DONE,
    FAILED,
}
