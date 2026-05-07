package com.capstone.gitmanager.github.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class WebhookPayload {

    // create 이벤트
    @JsonProperty("ref_type")
    public String refType;

    public String ref;

    // push 이벤트
    public List<Commit> commits;

    // pull_request 이벤트
    @JsonProperty("pull_request")
    public PullRequest pullRequest;

    public Repository repository;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Repository {
        public String name;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Commit {
        public String id;
        public String message;

        @JsonProperty("author")
        public CommitAuthor author;

        @JsonProperty("timestamp")
        public String timestamp;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CommitAuthor {
        public String name;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PullRequest {
        public boolean merged;

        public Head head;
        public Base base;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Head {
        public String ref;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Base {
        public String ref;
    }
}