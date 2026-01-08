#!/bin/bash
# Frontend Deployment Script for Cloud Run
# Run this from: d:\ups\foresite\frontend

set -e

echo "🏗️ Building frontend Docker image..."
docker build -t frontend-app .

echo "🏷️ Tagging image for GCP..."
docker tag frontend-app us-central1-docker.pkg.dev/codefamily-backend-482013/backend-repo/frontend

echo "📤 Pushing image to GCP Artifact Registry..."
docker push us-central1-docker.pkg.dev/codefamily-backend-482013/backend-repo/frontend

echo "🚀 Deploying to Cloud Run..."
gcloud run services update codefamily-frontend \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/codefamily-backend-482013/backend-repo/frontend

echo "✅ Frontend deployment complete!"
echo "🌐 Frontend URL: https://codefamily-frontend-854884449726.us-central1.run.app"
