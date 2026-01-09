package com.causa.issues

import java.util.UUID

@JvmInline
value class IssueId(val value: String) {
    companion object {
        fun newId(): IssueId = IssueId(UUID.randomUUID().toString())
    }
}
