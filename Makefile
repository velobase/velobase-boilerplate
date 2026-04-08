.PHONY: help build docker-build docker-push deploy

help:
	@echo "Available commands:"
	@echo "  make build         - Build Next.js application"
	@echo "  make docker-build  - Build Docker image locally"
	@echo "  make docker-push   - Push Docker image to registry"
	@echo "  make deploy        - Deploy to Kubernetes (via GitOps)"

build:
	pnpm build

docker-build:
	docker build -t vibevideo-art:latest .

docker-push:
	@echo "Use GitHub Actions to push images"

deploy:
	@echo "Deployment is automated via GitOps (ArgoCD)"
	@echo "Push to dev/pre/prod branch to trigger deployment"

