package sh.nunc.causa.issues

import org.springframework.data.jpa.repository.JpaRepository

interface IssueCommentRepository : JpaRepository<IssueCommentEntity, String> {
    fun findAllByIssueIdOrderByCreatedAtAsc(issueId: String): List<IssueCommentEntity>
    fun countByIssueIdAndCreatedAtAfter(issueId: String, createdAt: java.time.OffsetDateTime): Long
    fun findTopByIssueIdOrderByCreatedAtDesc(issueId: String): IssueCommentEntity?
    fun findFirstByIssueIdAndCreatedAtAfterOrderByCreatedAtAsc(
        issueId: String,
        createdAt: java.time.OffsetDateTime,
    ): IssueCommentEntity?
}
