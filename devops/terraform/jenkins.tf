# ──────────────────────────────────────────────
# Jenkins EC2 Instance
# ──────────────────────────────────────────────

# Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.jenkins_instance_type
  key_name               = var.jenkins_key_name
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  subnet_id              = aws_subnet.public[0].id
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user-data.log 2>&1

    echo "===== [1/9] System Update ====="
    dnf update -y

    echo "===== [2/9] Java 17 ====="
    dnf install -y java-17-amazon-corretto-devel

    echo "===== [3/9] Jenkins ====="
    curl -o /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
    rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    dnf install -y jenkins
    systemctl enable jenkins
    systemctl start jenkins

    echo "===== [4/9] Docker + SonarQube ====="
    dnf install -y docker
    systemctl enable docker
    systemctl start docker
    usermod -aG docker jenkins
    usermod -aG docker ec2-user

    # Run SonarQube as a Docker container
    docker pull sonarqube:10.4.1.88267-community
    docker run -d \
      --name sonarqube \
      --restart unless-stopped \
      -p 9000:9000 \
      -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
      sonarqube:10.4.1.88267-community

    echo "===== [5/9] Node.js 20 + NPM ====="
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
    npm install -g npm@latest
    node --version
    npm --version

    echo "===== [6/9] kubectl ====="
    curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    mv kubectl /usr/local/bin/

    echo "===== [7/9] AWS CLI v2 ====="
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    dnf install -y unzip git
    unzip awscliv2.zip
    ./aws/install

    echo "===== [8/9] Trivy ====="
    cat <<REPO > /etc/yum.repos.d/trivy.repo
    [trivy]
    name=Trivy repository
    baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/\$basearch/
    gpgcheck=0
    enabled=1
    REPO
    dnf install -y trivy

    echo "===== [9/9] SSH Hardening ====="
    sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/^#\?PermitEmptyPasswords.*/PermitEmptyPasswords no/' /etc/ssh/sshd_config
    sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
    sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
    sed -i 's/^#\?ClientAliveInterval.*/ClientAliveInterval 300/' /etc/ssh/sshd_config
    sed -i 's/^#\?ClientAliveCountMax.*/ClientAliveCountMax 2/' /etc/ssh/sshd_config
    systemctl restart sshd

    # Restart Jenkins to pick up docker group
    systemctl restart jenkins

    echo "===== Setup Complete ====="
    echo "Jenkins:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8080"
    echo "SonarQube: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):9000"
  EOF

  tags = {
    Name = "${var.project_name}-jenkins"
  }
}
