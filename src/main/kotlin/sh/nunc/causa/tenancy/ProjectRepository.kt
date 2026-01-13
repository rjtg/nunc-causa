package sh.nunc.causa.tenancy

import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<ProjectEntity, String>
