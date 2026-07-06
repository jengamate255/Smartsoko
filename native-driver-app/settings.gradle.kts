pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven("https://api.mapbox.com/downloads/v2/releases/maven") {
            authentication { create<BasicAuthentication>("basic") }
            credentials { username = "mapbox"; password = System.getenv("MAPBOX_DOWNLOADS_TOKEN") ?: "YOUR_MAPBOX_DOWNLOADS_TOKEN_HERE" }
        }
    }
}
rootProject.name = "SmartSoko Driver"
include(":app")