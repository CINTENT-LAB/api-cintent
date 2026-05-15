# CINTENT Production Deployment Guide

## Required Environment

- `NODE_ENV=production`
- `JWT_SECRET` set to a rotated high-entropy secret
- `DATABASE_URL` for PostgreSQL
- `REDIS_URL` for distributed session/cache coordination
- `NEO4J_URI`, `QDRANT_URL`, and `MINIO_ENDPOINT` when those services are enabled

## Local Production Stack

```bash
docker compose up -d --build
```

Production observability:

- API: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002`

## Kubernetes

Apply manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

Replace `k8s/secret.example.yaml` with a sealed secret, external secret, or cloud-native secret reference before production.

## Health Gates

- `/api/health`: liveness and hardening flags
- `/api/ready`: dependency readiness
- `/metrics`: Prometheus scrape endpoint
- `/api/status`: launch readiness summary

## Launch Validation

```bash
npm run test:production-hardening -- https://api-cintent.cognivantalabs.com
npm run test:orchestration-replay -- https://api-cintent.cognivantalabs.com
npm run test:enterprise-ux -- https://api-cintent.cognivantalabs.com
```
