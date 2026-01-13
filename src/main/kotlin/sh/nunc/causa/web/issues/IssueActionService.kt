package sh.nunc.causa.web.issues

import org.springframework.stereotype.Service
import sh.nunc.causa.issues.IssueDetailView
import sh.nunc.causa.issues.PhaseKind
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.tenancy.AccessPolicyService
import sh.nunc.causa.web.model.ActionDecision

@Service
class IssueActionService(
    private val accessPolicy: AccessPolicyService,
) : IssueActionProvider {
    override fun issueActions(issue: IssueDetailView): Map<String, ActionDecision> {
        val canModify = accessPolicy.canModifyIssue(issue.id)
        val allPhasesDone = issue.phases.all { it.status == PhaseStatus.DONE.name }
        val requiredKindsPresent = requiredKindsPresent(issue)
        val closeAllowed = canModify && allPhasesDone && requiredKindsPresent
        return mapOf(
            "CLOSE_ISSUE" to decision(
                closeAllowed,
                if (closeAllowed) null else "Incomplete or missing required phases block closure",
            ),
            "ABANDON_ISSUE" to decision(
                canModify,
                if (canModify) null else "No permission to abandon issue",
            ),
        )
    }

    override fun phaseActions(issue: IssueDetailView, phaseId: String): Map<String, ActionDecision> {
        val phase = issue.phases.firstOrNull { it.id == phaseId } ?: return emptyMap()
        val canModify = accessPolicy.canModifyIssue(issue.id)
        val phaseStatus = PhaseStatus.valueOf(phase.status)
        val allTasksDone = phase.tasks.all { it.status == TaskStatus.DONE.name }
        val markDoneAllowed = canModify && allTasksDone && phaseStatus != PhaseStatus.DONE
        val failAllowed = canModify && phaseStatus != PhaseStatus.FAILED
        val reopenAllowed = canModify && phaseStatus == PhaseStatus.FAILED
        return mapOf(
            "MARK_DONE" to decision(
                markDoneAllowed,
                if (markDoneAllowed) null else "Open tasks or insufficient permission",
            ),
            "FAIL_PHASE" to decision(
                failAllowed,
                if (failAllowed) null else "Phase already failed or insufficient permission",
            ),
            "REOPEN_PHASE" to decision(
                reopenAllowed,
                if (reopenAllowed) null else "Phase is not failed or insufficient permission",
            ),
        )
    }

    override fun taskActions(issue: IssueDetailView, phaseId: String, taskId: String): Map<String, ActionDecision> {
        val phase = issue.phases.firstOrNull { it.id == phaseId } ?: return emptyMap()
        val task = phase.tasks.firstOrNull { it.id == taskId } ?: return emptyMap()
        val canModify = accessPolicy.canModifyIssue(issue.id)
        val taskStatus = TaskStatus.valueOf(task.status)
        val markDoneAllowed = canModify && taskStatus != TaskStatus.DONE
        return mapOf(
            "MARK_DONE" to decision(
                markDoneAllowed,
                if (markDoneAllowed) null else "Task already done or insufficient permission",
            ),
        )
    }

    private fun decision(allowed: Boolean, reason: String?): ActionDecision {
        return ActionDecision(allowed = allowed, reason = reason)
    }

    private fun requiredKindsPresent(issue: IssueDetailView): Boolean {
        val phaseKinds = issue.phases.mapNotNull { PhaseKind.from(it.kind) }
        return PhaseKind.requiredKinds().all { required -> phaseKinds.contains(required) }
    }
}
