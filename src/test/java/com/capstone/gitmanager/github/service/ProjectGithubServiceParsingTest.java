package com.capstone.gitmanager.github.service;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectGithubServiceParsingTest {

    @Test
    void parseRepoNameRemovesDotGitSuffix() throws Exception {
        Method method = ProjectGithubService.class.getDeclaredMethod("parseRepoName", String.class);
        method.setAccessible(true);

        String repoName = (String) method.invoke(nullService(), "https://github.com/test-owner/test-repo.git");

        assertThat(repoName).isEqualTo("test-repo");
    }

    @Test
    void parseRepoNameKeepsPlainRepositoryName() throws Exception {
        Method method = ProjectGithubService.class.getDeclaredMethod("parseRepoName", String.class);
        method.setAccessible(true);

        String repoName = (String) method.invoke(nullService(), "https://github.com/test-owner/test-repo/");

        assertThat(repoName).isEqualTo("test-repo");
    }

    private ProjectGithubService nullService() {
        return new ProjectGithubService(null, null, null, null, null);
    }
}
