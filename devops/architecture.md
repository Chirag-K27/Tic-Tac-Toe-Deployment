# AWS Architecture — Node.js on EKS

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud                                  │
│                                                                         │
│  ┌──────────────────────── VPC (10.0.0.0/16) ────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌──────── Public Subnets ────────┐  ┌──── Private Subnets ─────┐ │  │
│  │  │                                │  │                           │ │  │
│  │  │  ┌──────────┐ ┌─────────────┐  │  │  ┌─────────────────────┐ │ │  │
│  │  │  │ Jenkins  │ │     ALB     │  │  │  │  EKS Worker Nodes   │ │ │  │
│  │  │  │ EC2      │ │ (Internet   │  │  │  │                     │ │ │  │
│  │  │  │ + Docker │ │  Facing)    │──│──│─▶│  ┌─────┐ ┌─────┐   │ │ │  │
│  │  │  │ + Trivy  │ │             │  │  │  │  │Pod 1│ │Pod 2│   │ │ │  │
│  │  │  │ + Sonar  │ └─────────────┘  │  │  │  └─────┘ └─────┘   │ │ │  │
│  │  │  └────┬─────┘                  │  │  │  ┌─────┐            │ │ │  │
│  │  │       │                        │  │  │  │Pod 3│            │ │ │  │
│  │  │  ┌────▼─────┐                  │  │  │  └─────┘            │ │ │  │
│  │  │  │   NAT    │                  │  │  └─────────────────────┘ │ │  │
│  │  │  │ Gateway  │──────────────────│──│──▶ Outbound Internet     │ │  │
│  │  │  └──────────┘                  │  │                           │ │  │
│  │  │  ┌──────────┐                  │  │  ┌─────────────────────┐ │ │  │
│  │  │  │ Internet │                  │  │  │  EKS Control Plane  │ │ │  │
│  │  │  │ Gateway  │                  │  │  │  (AWS Managed)      │ │ │  │
│  │  │  └──────────┘                  │  │  └─────────────────────┘ │ │  │
│  │  └────────────────────────────────┘  └───────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────┐                                                   │
│  │  ECR Repository  │ ◀── Docker images pushed by Jenkins               │
│  └──────────────────┘                                                   │
└──────────────────────────────────────────────────────────────────────────┘

         │                        ▲
         │  Users access app      │  Developer pushes code
         ▼  via ALB endpoint      │  to GitHub
    ┌─────────┐              ┌─────────┐
    │  Users  │              │ GitHub  │
    └─────────┘              └─────────┘
```

## Components Explained

### Networking
| Component | Purpose |
|---|---|
| **VPC** (10.0.0.0/16) | Isolated network for all resources |
| **Public Subnets** (10.0.1.0/24, 10.0.2.0/24) | Host ALB, Jenkins, NAT Gateway — internet accessible |
| **Private Subnets** (10.0.10.0/24, 10.0.20.0/24) | Host EKS worker nodes — no direct internet access |
| **Internet Gateway** | Enables public subnet internet access |
| **NAT Gateway** | Allows private subnet outbound internet (pulling images, updates) |

### Compute & Orchestration
| Component | Purpose |
|---|---|
| **EKS Control Plane** | AWS-managed Kubernetes API server |
| **EKS Node Group** | 2–4 t3.medium worker nodes in private subnets |
| **Jenkins EC2** | CI/CD server in public subnet |

### Security
| Component | Purpose |
|---|---|
| **EKS Cluster SG** | Only allows port 443 from worker nodes |
| **Node SG** | Allows inter-node traffic + control plane ports 1025–65535 |
| **Jenkins SG** | SSH (22), Jenkins UI (8080), SonarQube (9000) |
| **ALB SG** | HTTP (80) and HTTPS (443) from anywhere |
| **IAM Roles** | Least-privilege access for EKS, nodes, and Jenkins |

### CI/CD Flow
```
GitHub Push → Jenkins Webhook
    │
    ├─ 1. Checkout code
    ├─ 2. SonarQube static analysis
    ├─ 3. Docker build (multi-stage)
    ├─ 4. Trivy vulnerability scan
    ├─ 5. Push to ECR
    └─ 6. kubectl deploy to EKS (rolling update)
```

## Quick Start Commands

```bash
# 1. Deploy infrastructure
cd devops/terraform
terraform init
terraform plan -out=plan.out
terraform apply plan.out

# 2. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name nodejs-eks

# 3. Run Ansible for Jenkins setup
cd ../ansible
ansible-playbook playbooks/jenkins-setup.yaml
ansible-playbook playbooks/ssh-config.yaml

# 4. Access Jenkins
# URL: http://<jenkins-ip>:8080
# Get initial password from Terraform output or Ansible output
```
