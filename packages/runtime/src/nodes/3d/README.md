# Trellis Node - Replicate API Integration

## Overview

The Trellis node generates 3D models (GLB format) from images using the [Trellis model](https://replicate.com/firtoz/trellis) on Replicate.

## Input

- `images` (image, required, repeated): Input images to generate 3D model from (1-4 images for multi-view)

## Output

- `model` (gltf): Generated 3D model in GLB format
- `video` (blob): Color video preview of the 3D model

## How It Works

1. The node receives an image blob as input
2. Uploads the image to R2 storage
3. Generates a presigned URL (1 hour expiry) for the uploaded image
4. Sends the presigned URL to Replicate's Trellis model
5. Polls for completion and downloads the resulting GLB model

## API Integration

This node uses the Replicate API directly with an API token configured as an environment variable.

### API Request Flow

1. **Upload image** - Store in R2 and generate presigned URL
2. **Create prediction** - POST to Replicate API
3. **Poll for completion** - GET Replicate API until done
4. **Download results** - Fetch the generated GLB model and video

## Environment Variables

```
# Required for Replicate API
REPLICATE_API_TOKEN=xxx          # Replicate API token (from https://replicate.com/account/api-tokens)

# Required for presigned URLs (image upload to R2)
CLOUDFLARE_ACCOUNT_ID=xxx        # Your Cloudflare account ID
R2_ACCESS_KEY_ID=xxx             # R2 API token access key
R2_SECRET_ACCESS_KEY=xxx         # R2 API token secret key
R2_BUCKET_NAME=xxx               # R2 bucket name (e.g., dafthunk-ressources-production)
```

### Setting Secrets

```bash
# Development (.dev.vars file)
REPLICATE_API_TOKEN=r8_xxxxx

# Production
echo "r8_xxxxx" | pnpm wrangler secret put REPLICATE_API_TOKEN --env production
```

## Setting Up R2 Credentials

1. Go to https://dash.cloudflare.com/ → R2 Object Storage → Manage R2 API Tokens
2. Click "Create API token"
3. Configure:
   - **Token name**: `dafthunk-presigned-urls`
   - **Permissions**: Object Read & Write
   - **Specify bucket(s)**: Select your R2 bucket
4. Copy the **Access Key ID** and **Secret Access Key**
5. Set as secrets:
   ```bash
   echo "YOUR_ACCESS_KEY_ID" | pnpm wrangler secret put R2_ACCESS_KEY_ID --env production
   echo "YOUR_SECRET_ACCESS_KEY" | pnpm wrangler secret put R2_SECRET_ACCESS_KEY --env production
   echo "your-bucket-name" | pnpm wrangler secret put R2_BUCKET_NAME --env production
   ```

## References

- [Replicate Trellis Model](https://replicate.com/firtoz/trellis)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/get-started/)
- [Replicate Provider](https://developers.cloudflare.com/ai-gateway/usage/providers/replicate/)
- [R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
