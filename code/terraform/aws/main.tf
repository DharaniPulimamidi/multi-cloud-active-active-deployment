terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"

  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_assume" {
  statement { actions = ["sts:AssumeRole"] principals { type = "Service" identifiers = ["lambda.amazonaws.com"] } }
}

resource "aws_lambda_function" "app" {
  function_name = "multicloud-app",
  filename      = var.package_zip
  handler       = var.handler
  runtime       = var.runtime
  role          = aws_iam_role.lambda_exec.arn
}
