# PersianPages Secrets Manager Configuration

# Application Secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${local.name_prefix}-secrets"
  description = "Application secrets for ${local.name_prefix}"

  tags = {
    Name = "${local.name_prefix}-secrets"
  }
}

# Secret Values
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    DATABASE_URL         = local.database_url
    JWT_SECRET           = var.jwt_secret
    GOOGLE_CLIENT_ID     = var.google_client_id
    GOOGLE_CLIENT_SECRET = var.google_client_secret
    TWILIO_ACCOUNT_SID   = var.twilio_account_sid
    TWILIO_AUTH_TOKEN     = var.twilio_auth_token
    TWILIO_MESSAGING_SID  = var.twilio_messaging_sid
  })
}

# Output
output "secrets_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}
