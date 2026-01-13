package sh.nunc.causa.issues

import org.springframework.data.jpa.repository.JpaRepository

interface IssueCommentRepository : JpaRepository<IssueCommentEntity, String> {
    fun findAllByIssueIdOrderByCreatedAtAsc(issueId: String): List<IssueCommentEntity>
}
