#!/bin/bash

# PersianPages Deployment Helper Script
# Usage: ./scripts/deploy.sh [command]
# Commands: init, plan, apply, destroy, push-image, deploy-frontend, update-ecs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

# Load environment variables if .env exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_requirements() {
    local missing=0

    if ! command -v terraform &> /dev/null; then
        log_error "terraform is not installed"
        missing=1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "aws cli is not installed"
        missing=1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# Terraform commands
terraform_init() {
    log_info "Initializing Terraform..."
    cd "$TERRAFORM_DIR"
    terraform init
}

terraform_plan() {
    log_info "Running Terraform plan..."
    cd "$TERRAFORM_DIR"

    if [ -f "terraform.tfvars" ]; then
        terraform plan -var-file="terraform.tfvars"
    else
        log_warn "terraform.tfvars not found. Using default values."
        terraform plan
    fi
}

terraform_apply() {
    log_info "Applying Terraform configuration..."
    cd "$TERRAFORM_DIR"

    if [ -f "terraform.tfvars" ]; then
        terraform apply -var-file="terraform.tfvars"
    else
        log_warn "terraform.tfvars not found. Using default values."
        terraform apply
    fi
}

terraform_destroy() {
    log_warn "This will destroy all AWS resources!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" == "yes" ]; then
        cd "$TERRAFORM_DIR"
        if [ -f "terraform.tfvars" ]; then
            terraform destroy -var-file="terraform.tfvars"
        else
            terraform destroy
        fi
    else
        log_info "Cancelled."
    fi
}

terraform_output() {
    log_info "Getting Terraform outputs..."
    cd "$TERRAFORM_DIR"
    terraform output
}

# Docker/ECR commands
get_ecr_url() {
    cd "$TERRAFORM_DIR"
    terraform output -raw ecr_repository_url 2>/dev/null || echo ""
}

push_image() {
    log_info "Building and pushing Docker image to ECR..."

    ECR_URL=$(get_ecr_url)
    if [ -z "$ECR_URL" ]; then
        log_error "ECR repository URL not found. Run terraform apply first."
        exit 1
    fi

    # Get AWS account ID and region
    AWS_ACCOUNT_ID=$(echo $ECR_URL | cut -d. -f1)
    AWS_REGION=$(echo $ECR_URL | cut -d. -f4)

    # Login to ECR
    log_info "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL

    # Build image
    log_info "Building Docker image..."
    cd "$PROJECT_ROOT"
    docker build -f server/Dockerfile.prod -t persianpages-api ./server

    # Tag and push
    log_info "Tagging and pushing image..."
    docker tag persianpages-api:latest $ECR_URL:latest
    docker tag persianpages-api:latest $ECR_URL:$(git rev-parse --short HEAD)
    docker push $ECR_URL:latest
    docker push $ECR_URL:$(git rev-parse --short HEAD)

    log_info "Image pushed successfully: $ECR_URL:latest"
}

# Frontend deployment
deploy_frontend() {
    log_info "Building and deploying frontend..."

    cd "$TERRAFORM_DIR"
    S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
    CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")

    if [ -z "$S3_BUCKET" ]; then
        log_error "S3 bucket not found. Run terraform apply first."
        exit 1
    fi

    # Build frontend (append /api to the API URL)
    FULL_API_URL="${API_URL}/api"
    log_info "Building frontend with VITE_API_URL: $FULL_API_URL"
    cd "$PROJECT_ROOT/client"
    VITE_API_URL=$FULL_API_URL npm run build

    # Sync to S3
    log_info "Syncing to S3 bucket: $S3_BUCKET"
    aws s3 sync dist/ s3://$S3_BUCKET --delete

    # Invalidate CloudFront cache
    if [ -n "$CLOUDFRONT_ID" ]; then
        log_info "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
    fi

    log_info "Frontend deployed successfully!"
}

# ECS update
update_ecs() {
    log_info "Updating ECS service..."

    cd "$TERRAFORM_DIR"
    CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")

    if [ -z "$CLUSTER" ] || [ -z "$SERVICE" ]; then
        log_error "ECS cluster/service not found. Run terraform apply first."
        exit 1
    fi

    aws ecs update-service --cluster $CLUSTER --service $SERVICE --force-new-deployment

    log_info "ECS service update triggered. Use 'aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE' to wait for deployment."
}

# Full deployment
full_deploy() {
    log_info "Running full deployment..."

    push_image
    deploy_frontend
    update_ecs

    log_info "Full deployment completed!"
}

# Print deployment info
show_info() {
    log_info "Deployment Information:"
    echo ""
    cd "$TERRAFORM_DIR"
    terraform output deployment_summary 2>/dev/null || echo "Run 'terraform apply' first to see deployment info."
}

# Show help
show_help() {
    echo "PersianPages Deployment Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  init            Initialize Terraform"
    echo "  plan            Run Terraform plan"
    echo "  apply           Apply Terraform configuration"
    echo "  destroy         Destroy all AWS resources"
    echo "  output          Show Terraform outputs"
    echo "  push-image      Build and push Docker image to ECR"
    echo "  deploy-frontend Build and deploy frontend to S3/CloudFront"
    echo "  update-ecs      Update ECS service with new image"
    echo "  full-deploy     Run full deployment (image + frontend + ECS)"
    echo "  info            Show deployment information"
    echo "  help            Show this help message"
}

# Main
check_requirements

case "$1" in
    init)
        terraform_init
        ;;
    plan)
        terraform_plan
        ;;
    apply)
        terraform_apply
        ;;
    destroy)
        terraform_destroy
        ;;
    output)
        terraform_output
        ;;
    push-image)
        push_image
        ;;
    deploy-frontend)
        deploy_frontend
        ;;
    update-ecs)
        update_ecs
        ;;
    full-deploy)
        full_deploy
        ;;
    info)
        show_info
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
