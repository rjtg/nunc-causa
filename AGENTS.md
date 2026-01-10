# Repository Guidelines

## Project Structure & Module Organization
- `src/main/kotlin` holds Kotlin source code. Modules live under `sh/nunc/causa/*` (e.g., `sh/nunc/causa/eventstore`).
- `src/test/kotlin` is the location for tests (currently empty).
- `src/main/resources` contains Liquibase changelogs under `db/changelog`.
- Build tooling and settings are in `build.gradle.kts`, `settings.gradle.kts`, and `gradlew`.
- Architecture intent is documented in `ARCHITECTURE.md`.

## Build, Test, and Development Commands
- `./gradlew build` compiles, runs tests, and assembles the project.
- `./gradlew test` runs the JUnit test suite.
- `./gradlew bootRun` starts the Spring Boot app locally.
- `./gradlew tasks` lists available Gradle tasks.

## Coding Style & Naming Conventions
- Language: Kotlin (JVM 21). Prefer Kotlin data classes for events/projections and regular classes for services.
- Indentation: 4 spaces; keep lines concise and readable.
- Naming: packages are `lowercase` (e.g., `sh.nunc.causa.eventstore`), classes use `UpperCamelCase`, functions/vars use `lowerCamelCase`.
- Dependency injection: constructor-based (per `ARCHITECTURE.md`).

## Testing Guidelines
- Framework: JUnit Platform via `spring-boot-starter-test`.
- Place tests in `src/test/kotlin` mirroring the main package structure.
- Name tests with `*Test` suffix (e.g., `IssueAggregateTest`).
- Run with `./gradlew test`.

## Commit & Pull Request Guidelines
- No strict commit convention is documented; use short, imperative messages (e.g., "Add issue aggregate").
- Before updating an existing PR, verify it is still open (e.g., `gh pr view <number>` or `gh pr status`).
- PRs should describe the change, reference related tasks in `TODO_Codex.md`, and note any new endpoints or migrations.

## Reliability & Operations Notes
- Use Failsafe (`dev.failsafe:failsafe`) for retry/fallback policies around projection rebuilds.
- Projection management operations are exposed via Actuator endpoints (e.g., `/actuator/issueprojections`) and require `PROJECTION_MANAGE`.

## Architecture Overview
- The system is an event-sourced modular monolith using Spring Modulith.
- Event storage is currently a Postgres-backed implementation; see `sh/nunc/causa/eventstore`.
- REST endpoints live in `sh/nunc/causa/web`; operational health is exposed via `/actuator/health`.
