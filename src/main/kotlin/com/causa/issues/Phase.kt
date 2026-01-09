package com.causa.issues

data class Phase(
    val id: String,
    val name: String,
    val assignee: String,
    val status: PhaseStatus,
)

enum class PhaseStatus {
    NOT_STARTED,
    IN_PROGRESS,
    DONE,
}
