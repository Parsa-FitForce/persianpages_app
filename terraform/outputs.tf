# PersianPages Terraform Outputs

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.api.name
}

# Summary output for easy reference
output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    frontend_url      = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
    api_url           = var.domain_name != "" ? "https://api.${var.domain_name}" : "http://${aws_lb.api.dns_name}"
    ecr_repository    = aws_ecr_repository.backend.repository_url
    s3_bucket         = aws_s3_bucket.frontend.id
    cloudfront_id     = aws_cloudfront_distribution.frontend.id
    ecs_cluster       = aws_ecs_cluster.main.name
    ecs_service       = aws_ecs_service.api.name
    rds_endpoint      = aws_db_instance.main.endpoint
  }
}
