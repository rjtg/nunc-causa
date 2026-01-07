plugins {
    id("org.springframework.boot")
    kotlin("plugin.spring")
}

dependencies {
    implementation(project(":causa-issues"))
    implementation(project(":causa-workflows"))
    implementation(project(":causa-reporting"))
    implementation(project(":causa-users"))
    implementation(project(":causa-eventstore"))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
