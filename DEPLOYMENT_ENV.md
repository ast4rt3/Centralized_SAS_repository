# Environment Logic for Deployed Site

The file `env.js` is ignored by Git for security. On the **deployed site**, you need to generate this file during the deployment process.

# Environment Logic for GitHub Pages

Since you are using **GitHub Pages**, you can use **GitHub Actions** to securely generate the `env.js` file from your repository secrets during deployment. This keeps your credentials out of the Git history while allowing the live site to function.

## Setup Instructions

### 1. Add Repository Secrets
Go to your GitHub Repository:
**Settings > Secrets and variables > Actions > New repository secret**
Add the following secrets:
- `BACKEND_GAS_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_UPLOAD_PRESET`

### 2. Configure GitHub Actions
I have created a workflow file at `.github/workflows/static.yml`. This script will:
- Check out your code.
- Create `env.js` using the secrets you provided.
- Deploy the result to GitHub Pages.

## Alternative: Manual (Non-Secure)
If you don't want to use GitHub Actions and are okay with the keys being public in your repo:
1. Remove `env.js` from `.gitignore`.
2. Commit and push the `env.js` file directly.
