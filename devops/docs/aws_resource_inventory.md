# 📦 AWS Resource Inventory — What Exactly Gets Created?

This is the complete list of **every single resource** that Terraform + Kubernetes will create.

---

## 🖥️ EC2 Instances (3 Total)

| # | Name | Type | vCPU | RAM | Purpose | Subnet |
|---|---|---|---|---|---|---|
| 1 | `nodejs-eks-jenkins` | `t3.medium` | 2 | 4 GB | Runs Jenkins + SonarQube + Docker | **Public** |
| 2 | `nodejs-eks-node-group-...` | `t3.medium` | 2 | 4 GB | EKS Worker Node 1 (runs your app pods) | **Private** |
| 3 | `nodejs-eks-node-group-...` | `t3.medium` | 2 | 4 GB | EKS Worker Node 2 (runs your app pods) | **Private** |

> **Why t3.medium?** Jenkins needs RAM for Docker builds + SonarQube. EKS nodes need RAM because Kubernetes itself eats ~0.5 GB, leaving the rest for your app. A `t2.micro` (0.5 GB) will crash.

---

## 🌐 VPC & Networking (11 Resources)

| # | Resource | Count | Purpose |
|---|---|---|---|
| 1 | VPC | 1 | Your private network (`10.0.0.0/16`) |
| 2 | Public Subnets | 2 | For Jenkins + Load Balancer (internet-facing) |
| 3 | Private Subnets | 2 | For EKS worker nodes (hidden from internet) |
| 4 | Internet Gateway | 1 | Gives public subnets internet access |
| 5 | NAT Gateway | 1 | Lets private subnets download updates (outbound only) |
| 6 | Elastic IP | 1 | Static IP for NAT Gateway |
| 7 | Route Tables | 2 | Public route table + Private route table |
| 8 | Route Table Associations | 4 | Links each subnet to its route table |

---

## 🔒 Security Groups (4 Resources)

| # | Name | Inbound Ports | For |
|---|---|---|---|
| 1 | EKS Cluster SG | 443 (from worker nodes) | EKS control plane |
| 2 | Worker Node SG | All (between nodes), 1025-65535 (from cluster) | EKS nodes |
| 3 | Jenkins SG | 22 (SSH), 8080 (Jenkins UI), 9000 (SonarQube) | Jenkins EC2 |
| 4 | ALB SG | 80 (HTTP), 443 (HTTPS) | Load Balancer |

---

## 🎭 IAM (6 Resources)

| # | Resource | Purpose |
|---|---|---|
| 1 | EKS Cluster Role | Lets EKS manage the cluster |
| 2 | EKS Node Role | Lets worker nodes pull images + join cluster |
| 3 | Jenkins EC2 Role | Lets Jenkins push to ECR + talk to EKS |
| 4 | Jenkins Instance Profile | Attaches the role to the EC2 instance |
| 5 | EKS Cluster Policy Attachments | 2 AWS managed policies |
| 6 | EKS Node Policy Attachments | 3 AWS managed policies |

---

## ☸️ EKS & ECR (3 Resources)

| # | Resource | Purpose |
|---|---|---|
| 1 | EKS Cluster | The Kubernetes "brain" (AWS-managed, invisible) |
| 2 | EKS Node Group | Auto-scaling group for worker nodes (2–4 nodes) |
| 3 | ECR Repository | Docker image warehouse (stores your app images) |

---

## 🟢 Kubernetes Pods (What Runs Inside EKS)

After deployment, your 2 worker nodes will run these pods:

| Namespace | Pod | Count | What It Does |
|---|---|---|---|
| `nodejs-app` | `nodejs-app-*` | 3 | Your actual Node.js application |
| `monitoring` | `prometheus-*` | 1 | Collects metrics from everything |
| `monitoring` | `grafana-*` | 1 | Dashboard UI to view metrics |
| `monitoring` | `node-exporter-*` | 2 | Runs on each node for hardware metrics |
| `kube-system` | `coredns-*` | 2 | Internal DNS (auto-created by EKS) |
| `kube-system` | `aws-node-*` | 2 | Networking plugin (auto-created by EKS) |
| `kube-system` | `kube-proxy-*` | 2 | Network rules (auto-created by EKS) |

> **Total Pods: ~13** running across 2 worker nodes.

---

## ⚖️ Load Balancers (Created by Kubernetes)

| # | Name | Type | Port | For |
|---|---|---|---|---|
| 1 | App NLB | Network Load Balancer | 80 → 3000 | Your Node.js app (users access this) |
| 2 | Grafana NLB | Network Load Balancer | 80 → 3000 | Grafana dashboard |

> These are **not** in Terraform — Kubernetes creates them automatically when it sees `type: LoadBalancer` in the Service YAML.

---

## 🏭 Jenkins Jobs (3 Pipelines)

| # | Job Name | Jenkinsfile | Trigger |
|---|---|---|---|
| 1 | `nodejs-app-ci` | `Jenkinsfile-CI` | GitHub push (automatic) |
| 2 | `nodejs-app-cd` | `Jenkinsfile-CD` | Triggered by CI on success |
| 3 | `nodejs-app-cleanup` | `Jenkinsfile-Cleanup` | **Manual only** (run when done) |

---

## 💰 Estimated Monthly Cost (us-east-1)

| Resource | Cost |
|---|---|
| 3x t3.medium EC2 | ~$90/month |
| NAT Gateway | ~$32/month |
| 2x NLB | ~$36/month |
| EKS Cluster | ~$73/month |
| ECR (minimal storage) | ~$1/month |
| **Total** | **~$232/month** |

> ⚠️ **Run `terraform destroy` when done practicing!** Even a few days will cost real money.

---

## 🧹 Cleanup Order

When you're done, follow this exact order:

| Step | Where | Command |
|---|---|---|
| 1 | Jenkins UI | Run the `nodejs-app-cleanup` job |
| 2 | Your laptop terminal | `cd devops/terraform && terraform destroy` |
| 3 | AWS Console | Verify no orphaned resources (check EC2, VPC, EKS) |
