# PersianPages AWS Infrastructure

This directory contains Terraform configuration for deploying PersianPages to AWS.

## Architecture

```
                    ┌─────────────────┐
                    │   CloudFront    │ ──────────► S3 (Frontend)
                    │     (CDN)       │
                    └─────────────────┘

                    ┌─────────────────┐
                    │      ALB        │ ──────────► ECS Fargate (API)
                    │  (api.domain)   │                   │
                    └─────────────────┘                   │
                                                          ▼
                                                  ┌───────────────┐
                                                  │  RDS Postgres │
                                                  └───────────────┘
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0
- Docker (for building images)

## Quick Start

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   - Set secure passwords for `db_password` and `jwt_secret`
   - Configure Google OAuth credentials if using Google login

3. Initialize Terraform:
   ```bash
   terraform init
   ```

4. Review the plan:
   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

6. After apply completes, note the outputs for ECR URL, S3 bucket, etc.

## Post-Deployment Steps

1. **Push Backend Image to ECR:**
   ```bash
   # Get ECR login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ECR_URL>

   # Build and push
   cd ../server
   docker build -f Dockerfile.prod -t persianpages-api .
   docker tag persianpages-api:latest <ECR_URL>:latest
   docker push <ECR_URL>:latest
   ```

2. **Deploy Frontend to S3:**
   ```bash
   cd ../client
   VITE_API_URL=<ALB_URL>/api npm run build
   aws s3 sync dist/ s3://<S3_BUCKET> --delete
   aws cloudfront create-invalidation --distribution-id <CLOUDFRONT_ID> --paths "/*"
   ```

3. **Update ECS Service:**
   ```bash
   aws ecs update-service --cluster persianpages-prod-cluster --service persianpages-prod-api --force-new-deployment
   ```

## Using the Deploy Script

A helper script is provided at `../scripts/deploy.sh`:

```bash
# Initialize terraform
../scripts/deploy.sh init

# Plan changes
../scripts/deploy.sh plan

# Apply changes
../scripts/deploy.sh apply

# Push Docker image
../scripts/deploy.sh push-image

# Deploy frontend
../scripts/deploy.sh deploy-frontend

# Update ECS service
../scripts/deploy.sh update-ecs

# Full deployment
../scripts/deploy.sh full-deploy

# Show deployment info
../scripts/deploy.sh info
```

## GitHub Actions Secrets

For CI/CD, configure these secrets in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key with deployment permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `S3_BUCKET_NAME` | S3 bucket name (from terraform output) |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `API_URL` | ALB URL with /api path (e.g., `http://alb-xxx.us-east-1.elb.amazonaws.com/api`) |

## Cost Optimization

The default configuration costs approximately $80/month:
- ECS Fargate: ~$15
- RDS db.t3.micro: ~$15 (or free tier)
- ALB: ~$16
- NAT Gateway: ~$32
- S3 + CloudFront: ~$1-5

To reduce costs:
- Use FARGATE_SPOT for non-critical workloads
- Consider removing NAT Gateway if ECS doesn't need outbound internet
- Use RDS free tier eligible instance

## Destroying Infrastructure

```bash
terraform destroy
```

**Warning:** This will delete all resources including the database. Make sure to backup data first.

## Files

| File | Description |
|------|-------------|
| `main.tf` | Provider configuration |
| `variables.tf` | Input variables |
| `outputs.tf` | Output values |
| `vpc.tf` | VPC, subnets, security groups |
| `rds.tf` | PostgreSQL database |
| `ecr.tf` | Container registry |
| `ecs.tf` | ECS cluster and service |
| `alb.tf` | Application Load Balancer |
| `s3-cloudfront.tf` | Frontend hosting |
| `secrets.tf` | Secrets Manager |
