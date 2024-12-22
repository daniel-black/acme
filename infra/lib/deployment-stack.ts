import { CfnOutput, Stack, StackProps, Aws } from "aws-cdk-lib";
import {
  FederatedPrincipal,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EnvironmentName } from "../bin/infra";

interface DeploymentStackProps extends StackProps {
  environment: EnvironmentName;
  bucketName: string;
  cloudFrontDistributionId: string;
}

export class DeploymentStack extends Stack {
  constructor(scope: Construct, id: string, props: DeploymentStackProps) {
    super(scope, id, props);

    const gitHubOidcProvider = new OpenIdConnectProvider(
      this,
      `${props.environment}-GitHubOIDCProvider`,
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    const gitHubFederatedPrincipal = new FederatedPrincipal(
      gitHubOidcProvider.openIdConnectProviderArn,
      {
        StringEquals: {
          // String match for the GitHub repository and branch
          "token.actions.githubusercontent.com:sub": `repo:daniel-black/acme:ref:refs/heads/${props.environment}`,
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
      },
      "sts:AssumeRoleWithWebIdentity"
    );

    const frontendDeploymentRole = new Role(
      this,
      `${props.environment}-FrontendDeploymentRole`,
      {
        roleName: `${props.environment}-FrontendDeploymentRole`,
        assumedBy: gitHubFederatedPrincipal,
      }
    );

    // Allow frontendDeploymentRole to sync files to the S3 bucket and delete old files
    frontendDeploymentRole.addToPolicy(
      new PolicyStatement({
        actions: ["s3:PutObject", "s3:DeleteObject"],
        resources: [`arn:aws:s3:::${props.bucketName}/*`],
      })
    );

    // Allow frontendDeploymentRole to invalidate the CloudFront cache
    frontendDeploymentRole.addToPolicy(
      new PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: [
          `arn:aws:cloudfront::${Aws.ACCOUNT_ID}:distribution/${props.cloudFrontDistributionId}`,
        ],
      })
    );

    // Allow frontendDeploymentRole to read CloudFormation stack outputs
    frontendDeploymentRole.addToPolicy(
      new PolicyStatement({
        actions: ["cloudformation:DescribeStacks"],
        resources: ["*"],
      })
    );

    const infraDeploymentRole = new Role(
      this,
      `${props.environment}-InfraDeploymentRole`,
      {
        roleName: `${props.environment}-InfraDeploymentRole`,
        assumedBy: gitHubFederatedPrincipal,
      }
    );

    // Allow infraDeploymentRole to deploy the infra stack
    // Maybe this is too permissive? idk ill revisit it
    infraDeploymentRole.addToPolicy(
      new PolicyStatement({
        actions: [
          // CloudFormation actions
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStacks",

          // IAM actions (to pass roles)
          "iam:PassRole",

          // S3 actions (for creating/deleting buckets, uploading files, etc.)
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",

          // API Gateway actions (for managing APIs)
          "apigateway:*",

          // Cognito actions (for managing user pools, clients, etc.)
          "cognito-idp:*",
          "cognito-identity:*",

          // Lambda actions (for deploying and managing functions)
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:DeleteFunction",
          "lambda:InvokeFunction",
          "lambda:ListFunctions",

          // DynamoDB actions (for creating/managing tables)
          "dynamodb:CreateTable",
          "dynamodb:UpdateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeTable",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
        ],
        resources: ["*"],
      })
    );

    new CfnOutput(this, `${props.environment}-GitHubOIDCProviderARN`, {
      value: gitHubOidcProvider.openIdConnectProviderArn,
    });

    new CfnOutput(this, `${props.environment}-FrontendDeploymentRoleARN`, {
      value: frontendDeploymentRole.roleArn,
    });

    new CfnOutput(this, `${props.environment}-InfraDeploymentRoleARN`, {
      value: infraDeploymentRole.roleArn,
    });
  }
}
