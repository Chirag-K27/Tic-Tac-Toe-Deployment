# 📘 Complete DevOps Deployment Guide
> From zero to a running app on EKS — every single step.

---

## 🏢 How Do Companies Do It?

Before we start, here's how real companies handle this:

| Approach | What It Means | Used When |
|---|---|---|
| **Terraform** | Creates the "hardware" — VPC, EC2, EKS cluster | Always. This is standard. |
| **Kubectl + Manifests** | Deploys apps & monitoring YAML files into K8s | Most common for custom setups |
| **Helm Charts** | Pre-packaged "app stores" for K8s (like an installer) | Companies use `helm install prometheus` instead of writing YAML manually |
| **Jenkins Pipeline** | Can run `kubectl apply` or `helm install` as a pipeline stage | Some teams automate monitoring deployment too |

> **Our approach**: We use raw YAML manifests (not Helm). This is actually **better for learning** because you see every single line. Companies use Helm for convenience, but the YAML underneath is the same.

---

## ✅ Phase 0: Things to Prepare BEFORE You Start

Gather all of these before touching any terminal. Think of it as "packing your bag before a trip."

### 0.1 — Install These Tools on Your Computer

| Tool | Windows Install Command | What It Does |
|---|---|---|
| **Git** | Download from [git-scm.com](https://git-scm.com) | Version control |
| **AWS CLI v2** | Download `.msi` from [AWS](https://aws.amazon.com/cli/) | Talk to AWS from terminal |
| **Terraform** | `choco install terraform` or download from [terraform.io](https://www.terraform.io/downloads) | Build infrastructure |
| **kubectl** | `choco install kubernetes-cli` | Talk to Kubernetes |
| **VS Code** | Download from [code.visualstudio.com](https://code.visualstudio.com) | Your code editor |

> **Verify all installed:**
> ```powershell
> git --version
> aws --version
> terraform --version
> kubectl version --client
> ```

### 0.2 — Create Your AWS Account & IAM User

1. Go to [aws.amazon.com](https://aws.amazon.com) → Create a **free tier** account.
2. Go to **IAM** (search in the top bar).
3. Click **Users → Create User**.
4. Name: `devops-admin`.
5. Attach policy: **AdministratorAccess** (for learning only — never do this in production!).
6. Click **Security Credentials → Create Access Key**.
7. Choose **CLI** and download/save:

| Credential | Example | Where You'll Use It |
|---|---|---|
| **Access Key ID** | `AKIA5XYZ...` | `aws configure` |
| **Secret Access Key** | `wJalrXU...` | `aws configure` |
| **Account ID** (12 digits) | `123456789012` | Jenkins credential |

### 0.3 — Configure AWS CLI

```powershell
aws configure
```
```
AWS Access Key ID:     AKIA5XYZ...
AWS Secret Access Key: wJalrXU...
Default region:        us-east-1
Default output format: json
```

> **Verify:** `aws sts get-caller-identity` → Should show your Account ID.

### 0.4 — Create an SSH Key Pair (for Jenkins EC2)

Go to **AWS Console → EC2 → Key Pairs → Create Key Pair**:

| Field | Value |
|---|---|
| Name | `jenkins-key` |
| Type | RSA |
| Format | `.pem` |

> ⚠️ **Download the `.pem` file immediately** — AWS won't show it again! Save it somewhere safe.

### 0.5 — Create a GitHub Repository

1. Go to [github.com](https://github.com) → **New Repository**.
2. Name: `nodejs-devops-project`.
3. Make it **Public** (easier for Jenkins to access).
4. **Don't** add README or .gitignore (we'll push our code).

### 0.6 — Create a GitHub Personal Access Token

1. Go to **GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (Classic)**.
2. Click **Generate New Token (Classic)**.
3. Name: `jenkins-access`.
4. Select scopes: `repo` (full repo access).
5. Click **Generate Token**.
6. **Copy the token immediately** — you won't see it again!

| Credential | Example | Where You'll Use It |
|---|---|---|
| **GitHub Token** | `ghp_abc123...` | Jenkins credential |

---

## 🚀 Phase 1: Push Your Code to GitHub

```powershell
cd c:\Users\Chirag\Desktop\justTEst\demo

git init
git add .
git commit -m "Initial commit: Node.js app + DevOps setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nodejs-devops-project.git
git push -u origin main
```

---

## 🏗️ Phase 2: Build the Infrastructure (Terraform)

### Step 1: Initialize Terraform
```powershell
cd devops/terraform
terraform init
```
> This downloads the AWS "plugins" that Terraform needs.

### Step 2: Preview What Will Be Created
```powershell
terraform plan
```
> Read the output! It will say something like: `Plan: 25 to add, 0 to change, 0 to destroy`.

### Step 3: Build Everything!
```powershell
terraform apply
```
> Type `yes` when asked. This takes **10-15 minutes**. Go get chai. ☕

### Step 4: Save the Output
After it finishes, Terraform will print important info. **Copy these down:**
```powershell
terraform output
```

| Output | What It Is |
|---|---|
| `jenkins_public_ip` | IP address of your Jenkins server |
| `eks_cluster_name` | Name of your Kubernetes cluster |
| `ecr_repository_url` | Where Docker images are stored |

### Step 5: Connect kubectl to EKS
```powershell
aws eks update-kubeconfig --region us-east-1 --name nodejs-eks
```
> **Verify:** `kubectl get nodes` → Should show 2 worker nodes.

---

## 🏭 Phase 3: Setup Jenkins (The Factory Manager)

### Step 1: Open Jenkins in Browser
```
http://<jenkins_public_ip>:8080
```

### Step 2: Get the Initial Password
SSH into the Jenkins server:
```powershell
ssh -i "path\to\jenkins-key.pem" ec2-user@<jenkins_public_ip>
```
Then run:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```
Copy the password and paste it in the browser.

### Step 3: Install Suggested Plugins
Click **"Install Suggested Plugins"** and wait.

### Step 4: Install Additional Plugins
Go to **Manage Jenkins → Plugins → Available Plugins** and install:

| # | Plugin Name | Why |
|---|---|---|
| 1 | Docker Pipeline | Build Docker images in pipeline |
| 2 | SonarQube Scanner | Connect to SonarQube |
| 3 | Amazon ECR | Push images to ECR |
| 4 | Kubernetes CLI | Run kubectl commands |
| 5 | Pipeline: AWS Steps | AWS integration in pipelines |

> After installing, **restart Jenkins**: check the "Restart Jenkins" checkbox.

### Step 5: Add Credentials
Go to **Manage Jenkins → Credentials → System → Global → Add Credentials**:

#### Credential 1: AWS Account ID
| Field | Value |
|---|---|
| Kind | Secret text |
| Secret | `123456789012` (your 12-digit account ID) |
| ID | `aws-account-id` |
| Description | AWS Account ID |

#### Credential 2: GitHub Token
| Field | Value |
|---|---|
| Kind | Secret text |
| Secret | `ghp_abc123...` (your GitHub token) |
| ID | `github-token` |
| Description | GitHub PAT |

---

## 🔍 Phase 4: Setup SonarQube

### Step 1: Open SonarQube
```
http://<jenkins_public_ip>:9000
```
> Default login: `admin` / `admin` → It will ask you to change the password.

### Step 2: Create a SonarQube Token
1. Click your profile icon (top right) → **My Account**.
2. Go to **Security** tab.
3. **Token Name**: `jenkins`.
4. **Type**: Global Analysis Token.
5. Click **Generate**.
6. **Copy the token!**

| Credential | Example | Where You'll Use It |
|---|---|---|
| **SonarQube Token** | `sqp_abc123...` | Jenkins credential + system config |

### Step 3: Add SonarQube Token to Jenkins
Go back to **Jenkins → Manage Jenkins → Credentials → Add Credentials**:

| Field | Value |
|---|---|
| Kind | Secret text |
| Secret | `sqp_abc123...` |
| ID | `sonar-token` |
| Description | SonarQube Token |

### Step 4: Configure SonarQube Server in Jenkins
Go to **Manage Jenkins → System → SonarQube Servers → Add SonarQube**:

| Field | Value |
|---|---|
| Name | `SonarQube` |
| Server URL | `http://localhost:9000` |
| Authentication Token | Select `sonar-token` from dropdown |

### Step 5: Configure SonarQube Scanner Tool
Go to **Manage Jenkins → Tools → SonarQube Scanner → Add SonarQube Scanner**:

| Field | Value |
|---|---|
| Name | `sonar-scanner` |
| Install automatically | ✅ Checked |

---

## ⚡ Phase 5: Create Jenkins Jobs (The Pipelines)

### Job 1: CI Pipeline
1. **New Item** → Name: `nodejs-app-ci` → **Pipeline** → OK.
2. Under **Pipeline**:
   - **Definition**: Pipeline script from SCM.
   - **SCM**: Git.
   - **Repository URL**: `https://github.com/YOUR_USERNAME/nodejs-devops-project.git`
   - **Script Path**: `devops/jenkins/Jenkinsfile-CI`
3. Under **Build Triggers**:
   - ✅ **GitHub hook trigger for GITScm polling** (so it runs on every push).
4. **Save**.

### Job 2: CD Pipeline
1. **New Item** → Name: `nodejs-app-cd` → **Pipeline** → OK.
2. Under **Pipeline**:
   - **Definition**: Pipeline script from SCM.
   - **SCM**: Git.
   - **Repository URL**: Same as above.
   - **Script Path**: `devops/jenkins/Jenkinsfile-CD`
3. **Save**.
> This job is triggered **automatically by the CI pipeline** when it succeeds.

### (Optional) Setup GitHub Webhook
1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**.
2. **Payload URL**: `http://<jenkins_public_ip>:8080/github-webhook/`
3. **Content type**: `application/json`
4. **Events**: Just the push event.

---

## 📊 Phase 6: Deploy Monitoring (Prometheus + Grafana)

### Step 1: Apply All Monitoring Manifests
```powershell
kubectl apply -f devops/kubernetes/monitoring/
```

### Step 2: Verify Everything is Running
```powershell
kubectl get all -n monitoring
```
> You should see: prometheus pod, grafana pod, node-exporter pods (1 per node).

### Step 3: Access Grafana
```powershell
kubectl get svc grafana-service -n monitoring
```
> Copy the **EXTERNAL-IP** from the output. Open: `http://<EXTERNAL-IP>`

### Step 4: Login to Grafana
| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

### Step 5: Import Dashboards
1. Go to **Dashboards → Import**.
2. Enter dashboard ID and click **Load**:

| Dashboard ID | Name | What It Shows |
|---|---|---|
| `1860` | Node Exporter Full | CPU, RAM, Disk per worker node |
| `15760` | Kubernetes Cluster | Pods, deployments, namespaces overview |
| `6417` | Kubernetes Pods | Per-pod CPU, memory, network |

3. Select **Prometheus** as the datasource → **Import**.

---

## 🎬 Phase 7: Your First Deployment!

Now the magic moment. Push a code change:
```powershell
# Make any small change to your code
git add .
git commit -m "feat: my first CI/CD deployment"
git push origin main
```

Then watch Jenkins: `http://<jenkins_public_ip>:8080`
- The **CI pipeline** will start automatically.
- If all stages pass, the **CD pipeline** triggers.
- Your app will be live on the EKS LoadBalancer URL!

```powershell
kubectl get svc nodejs-app-service -n nodejs-app
```
> Open the **EXTERNAL-IP** in your browser 🎉

---

## 🧹 CLEANUP (Important — Avoid AWS Bills!)

When you're done practicing, **destroy everything**:
```powershell
# Delete K8s resources first
kubectl delete -f devops/kubernetes/monitoring/
kubectl delete -f devops/kubernetes/

# Then destroy Terraform infrastructure
cd devops/terraform
terraform destroy
```
> Type `yes`. This removes ALL AWS resources and stops billing.

---

## 📋 Master Credentials Checklist

Keep all of these ready before starting:

| # | Credential | Where to Get It | Where to Use It |
|---|---|---|---|
| 1 | AWS Access Key ID | IAM → Users → Security Credentials | `aws configure` |
| 2 | AWS Secret Access Key | IAM → Users → Security Credentials | `aws configure` |
| 3 | AWS Account ID (12 digits) | Top-right corner in AWS Console | Jenkins credential `aws-account-id` |
| 4 | SSH Key Pair (`.pem` file) | EC2 → Key Pairs → Create | SSH into Jenkins EC2 |
| 5 | GitHub PAT Token | GitHub → Settings → Developer → Tokens | Jenkins credential `github-token` |
| 6 | SonarQube Token | SonarQube UI → My Account → Security | Jenkins credential `sonar-token` |
| 7 | Grafana Password | Pre-set in manifest | `admin` / `admin123` |
