# PersianPages Route53 DNS Configuration

# Import existing hosted zone (persianpages.com)
data "aws_route53_zone" "main" {
  name = var.domain_name
}

# ACM Certificate for persianpages.com (must be us-east-1 for CloudFront)
resource "aws_acm_certificate" "frontend" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-frontend-cert"
  }
}

# DNS validation records for ACM
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]

  allow_overwrite = true
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# A record pointing domain to CloudFront
resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# www -> CloudFront (same distribution serves both)
resource "aws_route53_record" "frontend_www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.frontend.domain_name]
}

# Twilio domain verification TXT record
resource "aws_route53_record" "twilio_verification" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_twilio.${var.domain_name}"
  type    = "TXT"
  ttl     = 300

  records = [var.twilio_domain_verification]
}
