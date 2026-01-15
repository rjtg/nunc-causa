package sh.nunc.causa.issues

import java.util.UUID
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ContextConfiguration
import org.springframework.test.context.ActiveProfiles
import sh.nunc.causa.config.SearchConfig
import sh.nunc.causa.web.CausaApplication
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository

@DataJpaTest
@Import(SearchConfig::class)
@ContextConfiguration(classes = [CausaApplication::class])
@ActiveProfiles("test")
class IssueRepositoryWorkloadTest {
    @Autowired
    private lateinit var issueRepository: IssueRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `workload queries ignore closed statuses`() {
        val owner = userRepository.save(UserEntity(id = "owner", displayName = "Owner", email = null))
        val phaseUser = userRepository.save(UserEntity(id = "phase", displayName = "Phase", email = null))
        val taskUser = userRepository.save(UserEntity(id = "task", displayName = "Task", email = null))

        val openIssue = IssueEntity(
            id = "alpha-1",
            title = "Open issue",
            description = "Open issue",
            owner = owner,
            projectId = "project-alpha",
            issueNumber = 1,
            status = IssueStatus.IN_DEVELOPMENT.name,
        )
        val openPhase = PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = "Investigation",
            assignee = phaseUser,
            status = PhaseStatus.IN_PROGRESS.name,
            kind = "INVESTIGATION",
            issue = openIssue,
        )
        val openTask = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = "Open task",
            assignee = taskUser,
            status = TaskStatus.IN_PROGRESS.name,
            phase = openPhase,
        )
        openPhase.tasks.add(openTask)
        openIssue.phases.add(openPhase)
        issueRepository.save(openIssue)

        val closedIssue = IssueEntity(
            id = "alpha-2",
            title = "Closed issue",
            description = "Closed issue",
            owner = owner,
            projectId = "project-alpha",
            issueNumber = 2,
            status = IssueStatus.DONE.name,
        )
        val closedPhase = PhaseEntity(
            id = UUID.randomUUID().toString(),
            name = "Dev",
            assignee = phaseUser,
            status = PhaseStatus.DONE.name,
            kind = "DEVELOPMENT",
            issue = closedIssue,
        )
        val closedTask = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = "Closed task",
            assignee = taskUser,
            status = TaskStatus.ABANDONED.name,
            phase = closedPhase,
        )
        closedPhase.tasks.add(closedTask)
        closedIssue.phases.add(closedPhase)
        issueRepository.save(closedIssue)

        val issueCounts = issueRepository.findOwnerWorkload(
            userIds = listOf(owner.id),
            projectId = null,
            closedStatuses = listOf(IssueStatus.DONE.name, IssueStatus.FAILED.name),
        )
        val phaseCounts = issueRepository.findPhaseWorkload(
            userIds = listOf(phaseUser.id),
            projectId = null,
            closedStatuses = listOf(PhaseStatus.DONE.name, PhaseStatus.FAILED.name),
        )
        val taskCounts = issueRepository.findTaskWorkload(
            userIds = listOf(taskUser.id),
            projectId = null,
            closedStatuses = listOf(TaskStatus.DONE.name, TaskStatus.ABANDONED.name),
        )

        assertEquals(1, issueCounts.first().count)
        assertEquals(1, phaseCounts.first().count)
        assertEquals(1, taskCounts.first().count)
    }
}
