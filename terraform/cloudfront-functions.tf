# CloudFront Functions

resource "aws_cloudfront_function" "www_redirect" {
  name    = "${local.name_prefix}-www-redirect"
  runtime = "cloudfront-js-2.0"
  comment = "301 redirect www.${var.domain_name} to apex"
  publish = true
  code    = file("${path.module}/../lambda/cloudfront-functions/www-redirect.js")
}
