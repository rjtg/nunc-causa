package sh.nunc.causa.reporting

import org.springframework.data.jpa.repository.JpaRepository

interface IssueActivityRepository : JpaRepository<IssueActivityEntity, String> {
    fun findAllByIssueIdOrderByOccurredAtAsc(issueId: String): List<IssueActivityEntity>
}
