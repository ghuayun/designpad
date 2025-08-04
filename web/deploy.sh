#!/bin/bash

# DesignDraw Web Build and Deploy Script

set -e

echo "🚀 DesignDraw Web Deployment Script"
echo "==================================="

# Default values
ENVIRONMENT="production"
PORT=3000
REBUILD=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -r|--rebuild)
            REBUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env       Environment (development|production) [default: production]"
            echo "  -p, --port      Port number [default: 3000]"
            echo "  -r, --rebuild   Force rebuild of Docker image"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Environment: $ENVIRONMENT"
echo "Port: $PORT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build image
if [ "$REBUILD" = true ] || ! docker images | grep -q "designdraw-web"; then
    echo "🔨 Building Docker image..."
    docker build -t designdraw-web .
else
    echo "✅ Using existing Docker image"
fi

# Run based on environment
if [ "$ENVIRONMENT" = "development" ]; then
    echo "🔧 Starting development environment..."
    export PORT=$PORT
    docker-compose --profile dev up -d designdraw-dev
    
    echo "📋 Development server started!"
    echo "🌐 Access the app at: http://localhost:$PORT"
    echo "📝 Logs: docker-compose logs -f designdraw-dev"
    
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 Starting production environment..."
    export PORT=$PORT
    docker-compose up -d designdraw-web
    
    # Wait for health check
    echo "⏳ Waiting for application to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:$PORT/health > /dev/null; then
            echo "✅ Application is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Application failed to start properly"
            docker-compose logs designdraw-web
            exit 1
        fi
        sleep 2
    done
    
    echo "🎉 Production server started successfully!"
    echo "🌐 Access the app at: http://localhost:$PORT"
    echo "🏥 Health check: http://localhost:$PORT/health"
    echo "📝 Logs: docker-compose logs -f designdraw-web"
fi

echo ""
echo "📋 Useful commands:"
echo "  View logs:      docker-compose logs -f"
echo "  Stop services:  docker-compose down"
echo "  Restart:        docker-compose restart"
echo "  Shell access:   docker-compose exec designdraw-web sh"
