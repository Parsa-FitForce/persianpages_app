# PersianPages S3 Bucket for User-Uploaded Images

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name_prefix}-uploads-${random_id.suffix.hex}"

  tags = {
    Name = "${local.name_prefix}-uploads"
  }
}

# Allow public read access for serving images directly
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "uploads_public_read" {
  bucket = aws_s3_bucket.uploads.id

  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}

# CORS configuration for browser uploads
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

# Grant ECS task role permission to write to uploads bucket
resource "aws_iam_role_policy" "ecs_s3_uploads" {
  name = "${local.name_prefix}-ecs-s3-uploads"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}

output "uploads_bucket_name" {
  description = "S3 bucket name for user uploads"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_url" {
  description = "Public URL for uploaded images"
  value       = "https://${aws_s3_bucket.uploads.bucket_regional_domain_name}"
}
