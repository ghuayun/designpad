# DesignDraw Web

A web-based version of DesignDraw - a lightweight work/data flow design application similar to Excalidraw.

## Features

- **Full Web Compatibility**: Run DesignDraw in any modern web browser
- **No Installation Required**: Access the app instantly via URL
- **File Operations**: Save/load `.dd` files directly from browser
- **PNG Export**: Export drawings as PNG images
- **Auto-save**: Automatic saving to browser's local storage
- **Cross-platform**: Works on Windows, macOS, Linux, and mobile devices
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone or download the web directory
cd web

# Start production server
./deploy.sh

# Or on Windows
deploy.bat

# Access the app at http://localhost:3000
```

### Option 2: Node.js

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development with auto-reload
npm run dev
```

## Deployment Options

### 1. Docker Compose (Production)

```bash
# Production deployment
docker-compose up -d

# With custom port
PORT=8080 docker-compose up -d

# View logs
docker-compose logs -f
```

### 2. Docker Compose (Development)

```bash
# Development with file watching
docker-compose --profile dev up -d designdraw-dev

# Access at http://localhost:3001 (default dev port)
```

### 3. With Nginx Reverse Proxy

```bash
# Full production setup with Nginx
docker-compose --profile production up -d

# Includes rate limiting, caching, and SSL support
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment mode |

## Docker Commands

```bash
# Build image
docker build -t designdraw-web .

# Run container
docker run -p 3000:3000 designdraw-web

# Run with environment variables
docker run -p 8080:3000 -e PORT=3000 designdraw-web

# Development with volume mounting
docker run -p 3000:3000 -v $(pwd):/app designdraw-web npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application |
| `/health` | GET | Health check |
| `/api/status` | GET | Application status |

## File Structure

```
web/
├── public/           # Static web files
│   ├── index.html   # Main HTML file
│   ├── app.js       # Web-compatible application logic
│   └── styles.css   # Enhanced CSS for web
├── server/          # Express.js server
│   └── app.js       # Server application
├── Dockerfile       # Docker configuration
├── docker-compose.yml # Multi-container setup
├── nginx.conf       # Nginx reverse proxy config
├── package.json     # Node.js dependencies
└── deploy.sh        # Deployment script
```

## Features Comparison

| Feature | Desktop App | Web App |
|---------|-------------|---------|
| Drawing Tools | ✅ | ✅ |
| File Save/Load | ✅ | ✅ (Browser download/upload) |
| PNG Export | ✅ | ✅ |
| Auto-save | ✅ | ✅ (localStorage) |
| Offline Mode | ✅ | ❌ |
| System Integration | ✅ | ❌ |
| Cross-platform | ✅ | ✅ |
| No Installation | ❌ | ✅ |

## Browser Support

- **Chrome/Chromium**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

## Mobile Support

The web app is responsive and works on:
- iOS Safari
- Android Chrome
- Mobile Firefox

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Access at http://localhost:3000
```

### Adding Features

1. Modify `/public/app.js` for client-side functionality
2. Modify `/server/app.js` for server-side features
3. Update `/public/styles.css` for styling
4. Test with `npm run dev`

### Building and Deployment

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Deploy with script
./deploy.sh --env production --port 3000
```

## Production Deployment

### Cloud Platforms

#### Heroku
```bash
# Create Heroku app
heroku create designdraw-web

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: designdraw-web
services:
- name: web
  source_dir: web
  dockerfile_path: Dockerfile
  http_port: 3000
```

#### AWS ECS/Fargate
```bash
# Build and push to ECR
docker build -t designdraw-web .
docker tag designdraw-web:latest <account>.dkr.ecr.<region>.amazonaws.com/designdraw-web:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/designdraw-web:latest
```

### VPS/Server Deployment

```bash
# On your server
git clone <repository>
cd DesignDraw/web

# Deploy with Docker
./deploy.sh --env production --port 80

# Or with PM2
npm install -g pm2
pm2 start server/app.js --name designdraw-web
```

## Security Considerations

- HTTPS recommended for production
- Rate limiting configured in Nginx
- Security headers included
- Non-root Docker user
- Input validation on server

## Performance

- Gzip compression enabled
- Static file caching
- Nginx reverse proxy for production
- Health checks for monitoring
- Optimized Docker image (~50MB)

## Monitoring

```bash
# View application logs
docker-compose logs -f designdraw-web

# Check health status
curl http://localhost:3000/health

# Monitor with Docker stats
docker stats
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Use different port
   PORT=8080 docker-compose up -d
   ```

2. **Docker build fails**
   ```bash
   # Clean build
   docker system prune
   docker build --no-cache -t designdraw-web .
   ```

3. **Application not accessible**
   ```bash
   # Check container status
   docker-compose ps
   
   # View logs
   docker-compose logs designdraw-web
   ```

### Support

- Check the logs: `docker-compose logs -f`
- Verify health endpoint: `curl http://localhost:3000/health`
- Restart services: `docker-compose restart`

## License

MIT License - Same as the desktop application.
