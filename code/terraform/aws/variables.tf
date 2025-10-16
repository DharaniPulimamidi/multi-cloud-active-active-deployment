variable "aws_region" { type = string, default = "us-east-1" }
variable "package_zip" { type = string, default = "../artifact.zip" }
variable "handler" { type = string, default = "handler.handler" }
variable "runtime" { type = string, default = "nodejs18.x" }
