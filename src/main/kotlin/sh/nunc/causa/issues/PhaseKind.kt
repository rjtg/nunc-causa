package sh.nunc.causa.issues

enum class PhaseKind {
    INVESTIGATION,
    PROPOSE_SOLUTION,
    DEVELOPMENT,
    ACCEPTANCE_TEST,
    ROLLOUT,
    ;

    fun isAnalysis(): Boolean = this == INVESTIGATION || this == PROPOSE_SOLUTION

    companion object {
        private val requiredKinds = setOf(INVESTIGATION, DEVELOPMENT, ACCEPTANCE_TEST, ROLLOUT)

        fun from(value: String?): PhaseKind? {
            if (value.isNullOrBlank()) {
                return null
            }
            return try {
                valueOf(value)
            } catch (ex: IllegalArgumentException) {
                null
            }
        }

        fun requiredKinds(): Set<PhaseKind> = requiredKinds
    }
}
