package sh.nunc.causa.tenancy

import org.springframework.data.jpa.repository.JpaRepository

interface TeamRepository : JpaRepository<TeamEntity, String>
