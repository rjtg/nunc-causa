package sh.nunc.causa.issues

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PhaseEnumsTest {
    @Test
    fun `phase status includes expected values`() {
        val names = PhaseStatus.entries.map { it.name }

        assertTrue(names.containsAll(listOf("NOT_STARTED", "IN_PROGRESS", "FAILED", "DONE")))
    }

    @Test
    fun `task status includes expected values`() {
        val names = TaskStatus.entries.map { it.name }

        assertTrue(names.containsAll(listOf("NOT_STARTED", "IN_PROGRESS", "DONE")))
    }
}
