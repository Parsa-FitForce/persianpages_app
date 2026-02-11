# PersianPages Route53 DNS Configuration

# Import existing hosted zone (persianpages.com)
data "aws_route53_zone" "main" {
  name = var.domain_name
}

# Twilio domain verification TXT record
resource "aws_route53_record" "twilio_verification" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_twilio.${var.domain_name}"
  type    = "TXT"
  ttl     = 300

  records = [var.twilio_domain_verification]
}
