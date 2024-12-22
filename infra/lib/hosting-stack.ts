import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { EnvironmentName } from "../bin/infra";

export interface HostingStackProps extends StackProps {
  environment: EnvironmentName;
}

export class HostingStack extends Stack {
  public readonly bucketName: string;
  public readonly cloudFrontDistributionId: string;

  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, `${props.environment}-HostingBucket`, {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
    });

    this.bucketName = bucket.bucketName;

    const distribution = new Distribution(
      this,
      `${props.environment}-HostingDistribution`,
      {
        defaultBehavior: {
          origin: S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      }
    );

    this.cloudFrontDistributionId = distribution.distributionId;

    // Output the bucket name (for syncing files)
    new CfnOutput(this, `${props.environment}-HostingBucketARN`, {
      value: bucket.bucketArn,
    });

    // Output the distribution domain name
    new CfnOutput(this, `${props.environment}-HostingDistributionDomainName`, {
      value: distribution.distributionDomainName,
    });

    // Output the distribution ID (for invalidating cache)
    new CfnOutput(this, `${props.environment}-HostingDistributionId`, {
      value: distribution.distributionId,
    });
  }
}
