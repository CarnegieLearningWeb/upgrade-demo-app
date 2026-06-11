Before creating this experiment in UpGrade, set up a local UpGrade environment where you can configure the experiment and test the client integration.

This guide uses the Docker-based UpGrade setup for macOS or Linux. Docker starts the UpGrade backend API, frontend UI, and PostgreSQL database together.

### 1. Install Node.js and Yarn

UpGrade uses Node.js `22.14.0` for development and build compatibility. The recommended way to install it is with `nvm`.

```bash
# Install nvm, if needed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm into the current shell
source ~/.zshrc     # or ~/.bashrc, depending on your shell

# Install and use Node.js 22.14.0
nvm install 22.14.0
nvm use 22.14.0

# Install Yarn
npm install --global yarn

# Verify
node -v     # v22.14.0
yarn node -v
```

### 2. Install Docker

UpGrade's Docker environment requires Docker Engine and Docker Compose.

On macOS, install Docker Desktop:

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Install the `.dmg` file and move **Docker.app** into Applications
3. Open **Docker.app** before starting UpGrade

On Ubuntu/Debian Linux, install Docker Engine and Docker Compose:

```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo apt-get install -y docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version
docker compose version
```

### 3. Clone and install UpGrade

```bash
git clone https://github.com/CarnegieLearningWeb/UpGrade.git
cd UpGrade
yarn
```

This installs all backend, types, and frontend dependencies in the correct order.

### 4. Configure the backend environment

Create the Docker local environment file:

```bash
cp packages/backend/.env.docker.local.example packages/backend/.env.docker.local
```

Open `packages/backend/.env.docker.local` and update the local app context and metric configuration:

```env
CONTEXT_METADATA={{context_metadata}}
METRICS={{metrics_env}}
```

### 5. Configure the frontend environment

Create the local frontend environment file:

```bash
cp packages/frontend/projects/upgrade/src/environments/environment.local.example.ts packages/frontend/projects/upgrade/src/environments/environment.local.ts
```

### 6. Start UpGrade

From the UpGrade repository root, start the backend API, frontend UI, and PostgreSQL database.

The commands below use `docker-compose`. If your machine does not recognize `docker-compose`, replace it with `docker compose`.

```bash
docker-compose -f singleContainerApp-docker-compose.yml up -d
```

To view logs:

```bash
docker-compose -f singleContainerApp-docker-compose.yml logs -f
```

To stop UpGrade:

```bash
docker-compose -f singleContainerApp-docker-compose.yml down
```

### Local URLs

After UpGrade starts, open:

* Backend API: http://localhost:3030/api
* Frontend UI: http://localhost:4200

Use `http://localhost:3030` as the local UpGrade host URL in the client application.
