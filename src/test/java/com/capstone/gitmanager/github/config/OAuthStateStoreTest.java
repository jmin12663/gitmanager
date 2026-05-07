package com.capstone.gitmanager.github.config;

import com.capstone.gitmanager.common.config.JwtProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OAuthStateStoreTest {

    private final OAuthStateStore store = new OAuthStateStore(
            new JwtProperties(
                    "2026capstoneprojectgitmanager001superSecretKeyForJwtTokenSigning",
                    3600000L,
                    1209600000L
            )
    );

    @Test
    void saveAndReadState() {
        String token = store.save(1L, 2L, "https://github.com/test-owner/test-repo");

        OAuthStateStore.OAuthState state = store.getAndRemove(token);

        assertThat(state).isNotNull();
        assertThat(state.projectId()).isEqualTo(1L);
        assertThat(state.userId()).isEqualTo(2L);
        assertThat(state.repoUrl()).isEqualTo("https://github.com/test-owner/test-repo");
    }

    @Test
    void rejectTamperedState() {
        String token = store.save(1L, 2L, "https://github.com/test-owner/test-repo");

        OAuthStateStore.OAuthState state = store.getAndRemove(token + "tampered");

        assertThat(state).isNull();
    }

    @Test
    void rejectReusedState() {
        String token = store.save(1L, 2L, "https://github.com/test-owner/test-repo");

        OAuthStateStore.OAuthState firstRead = store.getAndRemove(token);
        OAuthStateStore.OAuthState secondRead = store.getAndRemove(token);

        assertThat(firstRead).isNotNull();
        assertThat(secondRead).isNull();
    }
}
