package sh.nunc.causa.reporting

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import sh.nunc.causa.issues.Issue
import sh.nunc.causa.issues.IssueId
import sh.nunc.causa.issues.Phase
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.Task
import sh.nunc.causa.issues.TaskStatus

@JdbcTest
@Import(IssueProjectionStore::class)
class IssueProjectionStoreTest(
    private val jdbcTemplate: JdbcTemplate,
    private val store: IssueProjectionStore,
) {
    @Test
    fun `rebuild writes projections and reads detail`() {
        createSchema()

        val issueId = IssueId("issue-1")
        val issue = Issue(
            id = issueId,
            title = "Improve onboarding",
            owner = "alice",
            projectId = "project-1",
            phases = listOf(
                Phase(
                    id = "phase-1",
                    name = "Investigation",
                    assignee = "bob",
                    status = PhaseStatus.IN_PROGRESS,
                    tasks = listOf(
                        Task(
                            id = "task-1",
                            title = "Collect logs",
                            assignee = "bob",
                            status = TaskStatus.DONE,
                        ),
                    ),
                ),
            ),
            version = 3,
        )

        store.rebuild(issue)

        val projection = store.getIssue(issueId)
        assertNotNull(projection)
        assertEquals("Improve onboarding", projection?.title)
        assertEquals(1, projection?.phases?.size)
        assertEquals(1, projection?.phases?.first()?.tasks?.size)
    }

    @Test
    fun `list issues supports filters`() {
        createSchema()

        val issueId = IssueId("issue-2")
        val issue = Issue(
            id = issueId,
            title = "Fix latency",
            owner = "carol",
            projectId = "project-2",
            phases = listOf(
                Phase(
                    id = "phase-2",
                    name = "Development",
                    assignee = "dave",
                    status = PhaseStatus.NOT_STARTED,
                    tasks = listOf(
                        Task(
                            id = "task-2",
                            title = "Profile DB",
                            assignee = "erin",
                            status = TaskStatus.NOT_STARTED,
                        ),
                    ),
                ),
            ),
            version = 2,
        )

        store.rebuild(issue)

        assertEquals(1, store.listIssues(owner = "carol", assignee = null, member = null, projectId = null).size)
        assertEquals(1, store.listIssues(owner = null, assignee = "dave", member = null, projectId = null).size)
        assertEquals(1, store.listIssues(owner = null, assignee = null, member = "erin", projectId = null).size)
        assertEquals(1, store.listIssues(owner = null, assignee = null, member = null, projectId = "project-2").size)
        assertEquals(0, store.listIssues(owner = "alice", assignee = null, member = null, projectId = null).size)
    }

    private fun createSchema() {
        jdbcTemplate.execute(
            """
            create table if not exists issue_projection (
                issue_id varchar(255) primary key,
                title varchar(255) not null,
                owner varchar(255) not null,
                project_id varchar(255),
                status varchar(32) not null,
                phase_count integer not null,
                version bigint not null
            );
            """.trimIndent(),
        )
        jdbcTemplate.execute(
            """
            create table if not exists issue_phase_projection (
                phase_id varchar(255) primary key,
                issue_id varchar(255) not null,
                name varchar(255) not null,
                assignee varchar(255) not null,
                status varchar(32) not null
            );
            """.trimIndent(),
        )
        jdbcTemplate.execute(
            """
            create table if not exists issue_task_projection (
                task_id varchar(255) primary key,
                phase_id varchar(255) not null,
                issue_id varchar(255) not null,
                title varchar(255) not null,
                assignee varchar(255),
                status varchar(32) not null
            );
            """.trimIndent(),
        )
    }
}
