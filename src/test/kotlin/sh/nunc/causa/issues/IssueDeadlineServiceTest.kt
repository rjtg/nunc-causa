package sh.nunc.causa.issues

import java.time.LocalDate
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import sh.nunc.causa.users.UserEntity

class IssueDeadlineServiceTest {
    private val deadlineService = IssueDeadlineService()

    @Test
    fun `rejects phase deadline beyond issue deadline`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-3",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = LocalDate.parse("2025-03-10"),
        )

        assertThrows(IllegalStateException::class.java) {
            deadlineService.ensurePhaseDeadlineWithinIssue(issue, LocalDate.parse("2025-03-15"))
        }
    }

    @Test
    fun `rejects task due date beyond phase deadline`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-4",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = LocalDate.parse("2025-03-10"),
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.NOT_STARTED.name,
            kind = PhaseKind.INVESTIGATION.name,
            deadline = LocalDate.parse("2025-03-08"),
            issue = issue,
        )
        issue.phases.add(phase)

        assertThrows(IllegalStateException::class.java) {
            deadlineService.validateTaskDates(
                issue,
                phase,
                startDate = LocalDate.parse("2025-03-01"),
                dueDate = LocalDate.parse("2025-03-12"),
                dependencies = emptyList(),
            )
        }
    }

    @Test
    fun `clamps phase and task deadlines when issue deadline is reduced`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-5",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
            deadline = LocalDate.parse("2025-03-20"),
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.IN_PROGRESS.name,
            kind = PhaseKind.INVESTIGATION.name,
            deadline = LocalDate.parse("2025-03-18"),
            issue = issue,
        )
        val task = TaskEntity(
            id = "task-1",
            title = "Prepare report",
            assignee = owner,
            status = TaskStatus.IN_PROGRESS.name,
            startDate = LocalDate.parse("2025-03-15"),
            dueDate = LocalDate.parse("2025-03-19"),
            phase = phase,
        )
        phase.tasks.add(task)
        issue.phases.add(phase)

        issue.deadline = LocalDate.parse("2025-03-16")
        deadlineService.applyIssueDeadlineConstraints(issue)

        assertEquals(LocalDate.parse("2025-03-16"), issue.deadline)
        assertEquals(LocalDate.parse("2025-03-16"), issue.phases.first().deadline)
        assertEquals(LocalDate.parse("2025-03-16"), issue.phases.first().tasks.first().dueDate)
        assertEquals(LocalDate.parse("2025-03-15"), issue.phases.first().tasks.first().startDate)
    }

    @Test
    fun `rejects task start date before dependency completion`() {
        val owner = UserEntity(id = "owner-1", displayName = "Owner")
        val issue = IssueEntity(
            id = "issue-6",
            title = "Issue",
            description = "Issue description.",
            owner = owner,
            projectId = "project-1",
            status = IssueStatus.IN_ANALYSIS.name,
        )
        val phase = PhaseEntity(
            id = "phase-1",
            name = "Analysis",
            assignee = owner,
            status = PhaseStatus.IN_PROGRESS.name,
            kind = PhaseKind.INVESTIGATION.name,
            issue = issue,
        )
        val dependencyTask = TaskEntity(
            id = "task-1",
            title = "Collect data",
            assignee = owner,
            status = TaskStatus.IN_PROGRESS.name,
            startDate = LocalDate.parse("2025-03-01"),
            dueDate = LocalDate.parse("2025-03-10"),
            phase = phase,
        )
        val task = TaskEntity(
            id = "task-2",
            title = "Analyze data",
            assignee = owner,
            status = TaskStatus.NOT_STARTED.name,
            startDate = LocalDate.parse("2025-03-05"),
            dueDate = LocalDate.parse("2025-03-12"),
            phase = phase,
        )
        phase.tasks.addAll(listOf(dependencyTask, task))
        issue.phases.add(phase)

        assertThrows(IllegalStateException::class.java) {
            deadlineService.validateTaskDates(
                issue,
                phase,
                startDate = LocalDate.parse("2025-03-05"),
                dueDate = LocalDate.parse("2025-03-12"),
                dependencies = listOf(
                    TaskDependencyView(type = TaskDependencyType.TASK.name, targetId = "task-1"),
                ),
            )
        }
    }
}
