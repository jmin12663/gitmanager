package com.capstone.gitmanager.project.entity;

import java.io.Serializable;
import java.util.Objects;

public class UserProjectId implements Serializable {

    private Long user;
    private Long project;

    public UserProjectId() {}

    public UserProjectId(Long user, Long project) {
        this.user = user;
        this.project = project;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserProjectId that)) return false;
        return Objects.equals(user, that.user) && Objects.equals(project, that.project);
    }

    @Override
    public int hashCode() {
        return Objects.hash(user, project);
    }
}