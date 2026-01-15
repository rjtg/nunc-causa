plugins {
    id("org.springframework.boot") version "3.2.5"
    id("io.spring.dependency-management") version "1.1.4"
    id("org.openapi.generator") version "7.5.0"
    id("io.gitlab.arturbosch.detekt") version "1.23.6"
    id("com.github.spotbugs") version "6.0.20"
    kotlin("jvm") version "1.9.23"
    kotlin("plugin.spring") version "1.9.23"
    kotlin("plugin.jpa") version "1.9.23"
}

group = "sh.nunc"
version = "0.0.1-SNAPSHOT"

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.boot:spring-boot-dependencies:3.2.5")
        mavenBom("org.springframework.modulith:spring-modulith-bom:1.2.2")
    }
}

dependencies {
    implementation(kotlin("stdlib"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.liquibase:liquibase-core")
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("jakarta.validation:jakarta.validation-api:3.0.2")
    implementation("org.hibernate.orm:hibernate-envers")
    implementation("org.hibernate.search:hibernate-search-mapper-orm:7.1.1.Final")
    implementation("org.hibernate.search:hibernate-search-backend-lucene:7.1.1.Final")
    implementation("io.swagger.core.v3:swagger-annotations-jakarta:2.2.22")
    implementation("io.swagger.core.v3:swagger-models-jakarta:2.2.22")
    implementation("io.github.serpro69:kotlin-faker:1.16.0")
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.mockk:mockk:1.13.10")
    testImplementation("com.ninja-squad:springmockk:4.0.2")
    testRuntimeOnly("com.h2database:h2")
    runtimeOnly("com.h2database:h2")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        jvmTarget = "21"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

detekt {
    buildUponDefaultConfig = true
    autoCorrect = false
    config.setFrom(files("config/detekt/detekt.yml"))
}

tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
    reports {
        xml.required.set(true)
        html.required.set(true)
        txt.required.set(false)
        sarif.required.set(false)
    }
}

spotbugs {
    toolVersion.set("4.8.6")
    effort.set(com.github.spotbugs.snom.Effort.MAX)
    reportLevel.set(com.github.spotbugs.snom.Confidence.LOW)
    excludeFilter.set(file("config/spotbugs/exclude-filter.xml"))
}

tasks.withType<com.github.spotbugs.snom.SpotBugsTask>().configureEach {
    reports {
        create("html") {
            required.set(true)
        }
        create("xml") {
            required.set(true)
        }
    }
}

tasks.named<com.github.spotbugs.snom.SpotBugsTask>("spotbugsTest") {
    enabled = false
}

tasks.named("check") {
    dependsOn("detekt", "spotbugsMain", "spotbugsTest")
}

tasks.register<Exec>("dev") {
    group = "application"
    description = "Run backend and UI in dev mode."
    commandLine("bash", "-lc", "./scripts/dev.sh")
}

val openApiSpec = layout.projectDirectory.file("src/main/resources/openapi/causa-api.yaml")
val openApiOutputDir = layout.buildDirectory.dir("generated/openapi")

openApiGenerate {
    generatorName.set("kotlin-spring")
    inputSpec.set(openApiSpec.asFile.absolutePath)
    outputDir.set(openApiOutputDir.get().asFile.absolutePath)
    apiPackage.set("sh.nunc.causa.web.api")
    modelPackage.set("sh.nunc.causa.web.model")
    invokerPackage.set("sh.nunc.causa.web.invoker")
    configOptions.set(
        mapOf(
            "interfaceOnly" to "true",
            "useTags" to "true",
            "enumPropertyNaming" to "UPPERCASE",
            "useSpringBoot3" to "true",
            "dateLibrary" to "java8",
            "serializationLibrary" to "jackson",
        ),
    )
}

sourceSets {
    main {
        kotlin.srcDir(openApiOutputDir.map { it.dir("src/main/kotlin") })
    }
}

tasks.named("compileKotlin") {
    dependsOn("openApiGenerate")
}
