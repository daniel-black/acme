import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class HostingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "HostingBucket", {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
