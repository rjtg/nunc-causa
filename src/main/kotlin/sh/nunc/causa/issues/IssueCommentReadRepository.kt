package sh.nunc.causa.issues

import org.springframework.data.jpa.repository.JpaRepository

interface IssueCommentReadRepository : JpaRepository<IssueCommentReadEntity, String> {
    fun findByIssueIdAndUserId(issueId: String, userId: String): IssueCommentReadEntity?
}
