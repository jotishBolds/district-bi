# ============================================

# District BI - Docker Deployment Guide

# ============================================

## Overview

This guide explains how to build and deploy the District BI application using Docker.

## Prerequisites

- Docker Engine 24.0+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd district-bi

# Copy environment template
cp .env.docker .env

# Edit environment variables
nano .env  # or use your preferred editor
```

### 2. Configure Environment Variables

Edit the `.env` file with your actual values:

```bash
# Required: Generate a secure secret
openssl rand -base64 32
# Copy the output to NEXTAUTH_SECRET

# Required: Configure database (use the Docker database or your cloud DB)
DATABASE_URL="postgresql://district_bi:changeme@db:5432/district_bi"

# Required: Configure AWS S3 for file storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BUCKET_NAME=your-bucket
AWS_REGION=ap-south-1

# Required: Configure email
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_USER=your-email
EMAIL_SERVER_PASSWORD=your-password

# Required: Configure SMS (ThunderSMS)
THUNDERSMS_USERNAME=your-username
THUNDERSMS_API_KEY=your-api-key
```

### 3. Build and Start

```bash
# Build the Docker image
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed initial data (if needed)
docker compose exec app npx prisma db seed
```

### 4. Verify Deployment

```bash
# Check service health
docker compose ps

# Test the application
curl http://localhost:3000/api/health
```

## Production Deployment

### With Nginx and SSL

1. Place your SSL certificates in `docker/nginx/ssl/`:

   - `fullchain.pem` - Certificate chain
   - `privkey.pem` - Private key

2. Start with production profile:

```bash
docker compose --profile production up -d
```

### Without Nginx (Behind Load Balancer)

If you're using a cloud load balancer (AWS ALB, Google Cloud LB, etc.):

```bash
docker compose up -d app db redis
```

## Commands Reference

### Building

```bash
# Build without cache
docker compose build --no-cache

# Build specific service
docker compose build app
```

### Managing Services

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes (WARNING: Deletes data)
docker compose down -v

# Restart specific service
docker compose restart app

# View logs
docker compose logs -f [service]
```

### Database Operations

```bash
# Run migrations
docker compose exec app npx prisma migrate deploy

# Generate Prisma client
docker compose exec app npx prisma generate

# Open Prisma Studio
docker compose exec app npx prisma studio

# Database backup
docker compose exec db pg_dump -U district_bi district_bi > backup.sql

# Database restore
docker compose exec -T db psql -U district_bi district_bi < backup.sql
```

### Maintenance

```bash
# Update to latest image
docker compose pull
docker compose up -d

# Clean up unused images
docker image prune -a

# View resource usage
docker stats
```

## Environment Variables

### Required

| Variable                | Description                  |
| ----------------------- | ---------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string |
| `NEXTAUTH_SECRET`       | Secret for JWT signing       |
| `NEXTAUTH_URL`          | Application URL              |
| `AWS_ACCESS_KEY_ID`     | AWS access key               |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key               |
| `AWS_BUCKET_NAME`       | S3 bucket name               |
| `EMAIL_SERVER_HOST`     | SMTP host                    |
| `EMAIL_SERVER_USER`     | SMTP username                |
| `EMAIL_SERVER_PASSWORD` | SMTP password                |
| `THUNDERSMS_USERNAME`   | SMS API username             |
| `THUNDERSMS_API_KEY`    | SMS API key                  |

### Optional

| Variable                 | Default    | Description               |
| ------------------------ | ---------- | ------------------------- |
| `NODE_ENV`               | production | Environment mode          |
| `ENABLE_REGISTRATION`    | false      | Allow public registration |
| `UPSTASH_REDIS_REST_URL` | -          | Redis for rate limiting   |

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs app

# Check container status
docker compose ps

# Verify environment
docker compose config
```

### Database connection failed

```bash
# Check database is running
docker compose exec db pg_isready

# Verify connection string
docker compose exec app npx prisma db push --preview-feature
```

### Health check failing

```bash
# Test health endpoint manually
docker compose exec app curl http://localhost:3000/api/health

# Check app logs
docker compose logs -f app
```

## Security Notes

1. **Change default passwords** in `.env` before deployment
2. **Use strong secrets** for NEXTAUTH_SECRET
3. **Configure firewall** to only expose necessary ports
4. **Enable HTTPS** in production using the nginx profile
5. **Regular updates**: Keep Docker images updated

## Scaling

For high availability, consider:

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **Redis**: Use managed Redis (AWS ElastiCache, Upstash)
3. **Load Balancing**: Deploy multiple app containers behind a load balancer
4. **CDN**: Use Cloudflare or similar for static assets

## Support

For issues, please check:

- Application logs: `docker compose logs app`
- Database logs: `docker compose logs db`
- Health endpoint: `http://localhost:3000/api/health`
