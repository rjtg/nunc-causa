plugins {
    id("io.spring.dependency-management") version "1.1.4" apply false
    id("org.springframework.boot") version "3.2.5" apply false
    kotlin("jvm") version "1.9.23" apply false
    kotlin("plugin.spring") version "1.9.23" apply false
}

allprojects {
    group = "com.causa"
    version = "0.0.1-SNAPSHOT"

    repositories {
        mavenCentral()
    }
}

subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "io.spring.dependency-management")

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

    tasks.withType<JavaCompile> {
        options.encoding = "UTF-8"
    }

    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions {
            jvmTarget = "21"
        }
    }

    tasks.withType<Test> {
        useJUnitPlatform()
    }

    dependencies {
        implementation(kotlin("stdlib"))
    }
}
