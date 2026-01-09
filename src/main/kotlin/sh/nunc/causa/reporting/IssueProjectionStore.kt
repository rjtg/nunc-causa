package sh.nunc.causa.reporting

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.issues.Issue
import sh.nunc.causa.issues.IssueId
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus

interface IssueProjectionReader {
    fun getIssue(issueId: IssueId): IssueProjection?
    fun listIssues(
        owner: String?,
        assignee: String?,
        member: String?,
        projectId: String?,
    ): List<IssueProjection>
}

interface IssueProjectionUpdater {
    fun rebuild(issue: Issue)
}

@Repository
class IssueProjectionStore(
    private val jdbcTemplate: JdbcTemplate,
) : IssueProjectionReader, IssueProjectionUpdater {

    override fun getIssue(issueId: IssueId): IssueProjection? {
        val issueSql = """
            select issue_id, title, owner, project_id, status, phase_count, version
            from issue_projection
            where issue_id = ?
        """.trimIndent()

        val issueRow = jdbcTemplate.query(issueSql, { rs, _ ->
            IssueProjection(
                id = rs.getString("issue_id"),
                title = rs.getString("title"),
                owner = rs.getString("owner"),
                projectId = rs.getString("project_id"),
                status = PhaseStatus.valueOf(rs.getString("status")),
                phaseCount = rs.getInt("phase_count"),
                version = rs.getLong("version"),
                phases = emptyList(),
            )
        }, issueId.value).firstOrNull() ?: return null

        val phases = loadPhases(issueId.value)
        return issueRow.copy(phases = phases)
    }

    override fun listIssues(
        owner: String?,
        assignee: String?,
        member: String?,
        projectId: String?,
    ): List<IssueProjection> {
        val sql = StringBuilder(
            """
            select issue_id, title, owner, project_id, status, phase_count, version
            from issue_projection
            where 1 = 1
            """.trimIndent(),
        )
        val args = mutableListOf<Any>()

        if (!owner.isNullOrBlank()) {
            sql.append(" and owner = ?")
            args.add(owner)
        }
        if (!projectId.isNullOrBlank()) {
            sql.append(" and project_id = ?")
            args.add(projectId)
        }
        if (!assignee.isNullOrBlank()) {
            sql.append(
                """
                 and exists (
                    select 1 from issue_phase_projection p
                    where p.issue_id = issue_projection.issue_id
                      and p.assignee = ?
                 )
                """.trimIndent(),
            )
            args.add(assignee)
        }
        if (!member.isNullOrBlank()) {
            sql.append(
                """
                 and (
                    owner = ?
                    or exists (
                        select 1 from issue_phase_projection p
                        where p.issue_id = issue_projection.issue_id
                          and p.assignee = ?
                    )
                    or exists (
                        select 1 from issue_task_projection t
                        where t.issue_id = issue_projection.issue_id
                          and t.assignee = ?
                    )
                 )
                """.trimIndent(),
            )
            args.add(member)
            args.add(member)
            args.add(member)
        }

        return jdbcTemplate.query(sql.toString(), { rs, _ ->
            IssueProjection(
                id = rs.getString("issue_id"),
                title = rs.getString("title"),
                owner = rs.getString("owner"),
                projectId = rs.getString("project_id"),
                status = PhaseStatus.valueOf(rs.getString("status")),
                phaseCount = rs.getInt("phase_count"),
                version = rs.getLong("version"),
                phases = emptyList(),
            )
        }, *args.toTypedArray())
    }

    @Transactional
    override fun rebuild(issue: Issue) {
        val issueStatus = issue.phases.toIssueStatus()
        val updated = jdbcTemplate.update(
            """
            update issue_projection
            set title = ?, owner = ?, project_id = ?, status = ?, phase_count = ?, version = ?
            where issue_id = ?
            """.trimIndent(),
            issue.title,
            issue.owner,
            issue.projectId,
            issueStatus.name,
            issue.phases.size,
            issue.version,
            issue.id.value,
        )

        if (updated == 0) {
            jdbcTemplate.update(
                """
                insert into issue_projection (issue_id, title, owner, project_id, status, phase_count, version)
                values (?, ?, ?, ?, ?, ?, ?)
                """.trimIndent(),
                issue.id.value,
                issue.title,
                issue.owner,
                issue.projectId,
                issueStatus.name,
                issue.phases.size,
                issue.version,
            )
        }

        jdbcTemplate.update("delete from issue_task_projection where issue_id = ?", issue.id.value)
        jdbcTemplate.update("delete from issue_phase_projection where issue_id = ?", issue.id.value)

        issue.phases.forEach { phase ->
            jdbcTemplate.update(
                """
                insert into issue_phase_projection (phase_id, issue_id, name, assignee, status)
                values (?, ?, ?, ?, ?)
                """.trimIndent(),
                phase.id,
                issue.id.value,
                phase.name,
                phase.assignee,
                phase.status.name,
            )
            phase.tasks.forEach { task ->
                jdbcTemplate.update(
                    """
                    insert into issue_task_projection (task_id, phase_id, issue_id, title, assignee, status)
                    values (?, ?, ?, ?, ?, ?)
                    """.trimIndent(),
                    task.id,
                    phase.id,
                    issue.id.value,
                    task.title,
                    task.assignee,
                    task.status.name,
                )
            }
        }
    }

    private fun loadPhases(issueId: String): List<PhaseProjection> {
        val phaseSql = """
            select phase_id, name, assignee, status
            from issue_phase_projection
            where issue_id = ?
            order by phase_id
        """.trimIndent()
        val taskSql = """
            select task_id, phase_id, title, assignee, status
            from issue_task_projection
            where issue_id = ?
            order by task_id
        """.trimIndent()

        val tasksByPhase = jdbcTemplate.query(taskSql, { rs, _ ->
            val phaseId = rs.getString("phase_id")
            phaseId to TaskProjection(
                id = rs.getString("task_id"),
                title = rs.getString("title"),
                assignee = rs.getString("assignee"),
                status = TaskStatus.valueOf(rs.getString("status")),
            )
        }, issueId).groupBy({ it.first }, { it.second })

        return jdbcTemplate.query(phaseSql, { rs, _ ->
            val phaseId = rs.getString("phase_id")
            PhaseProjection(
                id = phaseId,
                name = rs.getString("name"),
                assignee = rs.getString("assignee"),
                status = PhaseStatus.valueOf(rs.getString("status")),
                tasks = tasksByPhase[phaseId].orEmpty(),
            )
        }, issueId)
    }
}

private fun List<sh.nunc.causa.issues.Phase>.toIssueStatus(): PhaseStatus {
    if (isEmpty()) return PhaseStatus.NOT_STARTED
    return when {
        all { it.status == PhaseStatus.DONE } -> PhaseStatus.DONE
        all { it.status == PhaseStatus.NOT_STARTED } -> PhaseStatus.NOT_STARTED
        else -> PhaseStatus.IN_PROGRESS
    }
}
