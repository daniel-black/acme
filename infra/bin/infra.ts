#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { HostingStack } from "../lib/hosting-stack";
import { DeploymentStack } from "../lib/deployment-stack";

const environments = ["dev", "prod"] as const;
export type EnvironmentName = (typeof environments)[number];

const app = new App();

// When GitHub Actions runs the workflow, github.ref_name will be either "dev" or "prod"
// "dev" or "prod"
const environment = app.node.tryGetContext("environment");

if (!environment) {
  throw new Error(
    "Context variable 'environment' is required. Pass it using -c environment=<value>"
  );
}

if (environment !== "dev" && environment !== "prod") {
  throw new Error(
    `Invalid environment name '${environment}'. Allowed values are: 'dev' or 'prod'.`
  );
}

// At this point, we know that environment is either "dev" or "prod"

const hostingStack = new HostingStack(app, `${environment}-HostingStack`, {
  environment,
});

// deploymentStack depends on hostingStack
const deploymentStack = new DeploymentStack(
  app,
  `${environment}-DeploymentStack`,
  {
    environment,
    bucketName: hostingStack.bucketName,
    cloudFrontDistributionId: hostingStack.cloudFrontDistributionId,
  }
);
