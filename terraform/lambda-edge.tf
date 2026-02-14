# Lambda@Edge for SEO Meta Tag Injection

# IAM Role for Lambda@Edge
resource "aws_iam_role" "lambda_edge" {
  name = "${local.name_prefix}-lambda-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-lambda-edge-role"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  role       = aws_iam_role.lambda_edge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Zip the Lambda function code
data "archive_file" "seo_prerender" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/seo-prerender"
  output_path = "${path.module}/.build/seo-prerender.zip"
}

# Lambda@Edge function (must be in us-east-1)
resource "aws_lambda_function" "seo_prerender" {
  filename         = data.archive_file.seo_prerender.output_path
  function_name    = "${local.name_prefix}-seo-prerender"
  role             = aws_iam_role.lambda_edge.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5
  memory_size      = 128
  publish          = true
  source_code_hash = data.archive_file.seo_prerender.output_base64sha256

  tags = {
    Name = "${local.name_prefix}-seo-prerender"
  }
}

# Output the Lambda ARN for reference
output "seo_prerender_lambda_arn" {
  description = "SEO prerender Lambda@Edge qualified ARN"
  value       = aws_lambda_function.seo_prerender.qualified_arn
}
