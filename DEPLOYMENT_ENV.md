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
- `SYSTEMS_CONFIG_JSON` (Copy and paste the entire JSON from your `systems/config.json` before deleting it)

### 3. Change GitHub Pages Source (CRITICAL)
For the workflow I provided to work, you must tell GitHub to use Actions instead of just copying the branch:
1. Go to your GitHub Repository: **Settings > Pages**
2. Under **Build and deployment > Source**, change the dropdown from **"Deploy from a branch"** to **"GitHub Actions"**.

### 4. Push and Verify
After making these changes, you must **Push** the new `.github/workflows/static.yml` file to your repo.
- Go to the **Actions** tab in GitHub to see if the "Deploy static content to Pages" job is running.
- Once it turns green, your site will be updated with the secrets.

## Alternative: Manual (Non-Secure)
If you don't want to use GitHub Actions and are okay with the keys being public in your repo:
1. Remove `env.js` from `.gitignore`.
2. Commit and push the `env.js` file directly.
