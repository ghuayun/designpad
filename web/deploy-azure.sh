#!/bin/bash

# DesignPad Azure Deployment Script
# Cross-platform shell script for Linux/macOS deployment to Azure

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-designdraw-855}"
CONTAINER_APP="${CONTAINER_APP:-designdraw-web-516}"
REGISTRY="${REGISTRY:-acr54239}"
IMAGE_NAME="${IMAGE_NAME:-designpad}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "================================================"
    echo "          DesignPad Azure Deployment"
    echo "================================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    exit 1
}

print_info() {
    echo -e "${BLUE}🔍 $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed or not in PATH"
    fi
}

# Main script
print_header

# Generate timestamp version
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
VERSION="v$TIMESTAMP"
FULL_IMAGE="$REGISTRY.azurecr.io/$IMAGE_NAME:$VERSION"

echo "Resource Group: $RESOURCE_GROUP"
echo "Container App:  $CONTAINER_APP"
echo "Registry:       $REGISTRY.azurecr.io"
echo "Image:          $FULL_IMAGE"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

check_command "docker"
check_command "az"

# Check if Docker is running
if ! docker version &> /dev/null; then
    print_error "Docker is not running. Please start Docker."
fi
print_success "Docker is running"

# Check Azure CLI login
if ! az account show &> /dev/null; then
    print_error "Not logged into Azure CLI. Run 'az login' first."
fi
CURRENT_ACCOUNT=$(az account show --query "user.name" -o tsv)
print_success "Azure CLI logged in as: $CURRENT_ACCOUNT"

# Build Docker image
echo ""
print_info "Building Docker image..."
if docker build -t "$IMAGE_NAME:latest" .; then
    print_success "Docker build completed"
else
    print_error "Docker build failed"
fi

# Tag image
echo ""
print_info "Tagging image..."
if docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE"; then
    print_success "Image tagged: $FULL_IMAGE"
else
    print_error "Docker tag failed"
fi

# Push to registry
echo ""
print_info "Pushing to Azure Container Registry..."
if docker push "$FULL_IMAGE"; then
    print_success "Image pushed successfully"
else
    print_error "Docker push failed"
fi

# Update Container App
echo ""
print_info "Updating Azure Container App..."
if az containerapp update \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$FULL_IMAGE" > /dev/null; then
    print_success "Container app updated successfully"
else
    print_error "Container app update failed"
fi

# Get app URL
APP_URL=$(az containerapp show \
    --name "$CONTAINER_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" \
    -o tsv)

# Final success message
echo ""
echo -e "${CYAN}================================================"
echo "          Deployment Completed!"
echo "================================================${NC}"
echo ""
echo "🔗 Your app is available at:"
echo "  • https://designpad.info"
echo "  • https://designpad.info/stats" 
echo "  • https://$APP_URL"
echo ""
echo "📦 Image deployed: $FULL_IMAGE"
echo ""
print_success "Deployment completed successfully!"
