package com.capstone.gitmanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class GitmanagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(GitmanagerApplication.class, args);
    }

}
