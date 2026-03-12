# ⚙️ Jenkins Configuration Checklist

To make the pipelines work, you need to set up these specific items in your Jenkins UI (**Manage Jenkins**).

---

## 🔌 1. Required Plugins
Install these from **Manage Jenkins > Plugins > Available plugins**:

1.  **Docker Pipeline**: Allows Jenkins to talk to the Docker engine.
2.  **AWS Steps**: Adds blocks like `withAWS` to your pipeline.
3.  **SonarQube Scanner**: Connects Jenkins to the SonarQube analysis server.
4.  **Quality Gate**: Allows the pipeline to "pause" and wait for Sonar results.
5.  **Amazon ECR**: Specifically for authenticating and pushing to Amazon's registry.
6.  **Kubernetes CLI**: Allows Jenkins to use `kubectl` commands.
7.  **Pipeline Stage View**: (Standard) Gives you the nice green boxes for stages.

---

## 🔑 2. Required Credentials
Add these in **Manage Jenkins > Credentials > System > Global credentials > Add Credentials**:

| ID | Type | What to put in the value |
|---|---|---|
| `aws-account-id` | **Secret text** | Your 12-digit AWS Account ID (e.g., `123456789012`) |
| `aws-credentials` | **AWS Credentials** | Your AWS Access Key ID and Secret Access Key |
| `github-token` | **Secret text** | A Classic Personal Access Token from GitHub (repo scope) |
| `sonar-token` | **Secret text** | A token generated inside SonarQube (Security > Tokens) |

---

## 🏗️ 3. System Configuration
Configure these in **Manage Jenkins > System**:

### SonarQube Servers
1.  Click **Add SonarQube**.
2.  **Name**: `SonarQube` (Must match the `withSonarQubeEnv` name in your Jenkinsfile).
3.  **Server URL**: `http://localhost:9000` (Since Sonar is running on the same machine).
4.  **Server authentication token**: Choose the `sonar-token` you created above.

---

## 🛠️ 4. Tools Configuration
Configure these in **Manage Jenkins > Tools**:

### SonarQube Scanner
1.  Click **Add SonarQube Scanner**.
2.  **Name**: `sonar-scanner`.
3.  **Install automatically**: ✅ Checked.

---

## 🌍 5. Pipeline Environment Variables
These are already defined *inside* your `Jenkinsfile-CI` and `Jenkinsfile-CD`. You don't need to add them to Jenkins UI, but you should know where they are:

*   `AWS_REGION`: Set to `us-east-1`.
*   `ECR_REPO`: Set to `nodejs-app`.
*   `EKS_CLUSTER_NAME`: Set to `nodejs-eks`.
*   `K8S_NAMESPACE`: Set to `nodejs-app`.

---

### 💡 Troubleshooting Tip:
If a stage fails with `"command not found: docker"` or `"command not found: kubectl"`, it means the **Jenkins server user** doesn't have permission.
- The Terraform `user_data` already runs `usermod -aG docker jenkins`, but sometimes you need to restart the Jenkins service one more time manually:
  ```bash
  sudo systemctl restart jenkins
  ```
