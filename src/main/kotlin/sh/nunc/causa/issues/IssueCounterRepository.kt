package sh.nunc.causa.issues

import org.springframework.data.jpa.repository.JpaRepository

interface IssueCounterRepository : JpaRepository<IssueCounterEntity, String> {
}
