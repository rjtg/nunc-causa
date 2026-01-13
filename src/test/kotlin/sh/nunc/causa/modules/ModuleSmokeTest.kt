package sh.nunc.causa.modules

import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssuesModule
import sh.nunc.causa.reporting.ReportingModule
import sh.nunc.causa.users.UsersModule
import sh.nunc.causa.web.WebModule
import sh.nunc.causa.workflows.WorkflowsModule

class ModuleSmokeTest {
    @Test
    fun `modules instantiate`() {
        IssuesModule()
        ReportingModule()
        UsersModule()
        WebModule()
        WorkflowsModule()
    }
}
