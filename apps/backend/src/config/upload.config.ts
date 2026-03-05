import * as path from 'path';
import * as fs from 'fs';

let uploadRoot = process.env.UPLOAD_DIR;

if (!uploadRoot) {
  // Check if we are running from project root
  const appsBackendUploads = path.join(process.cwd(), 'apps', 'backend', 'uploads');
  const localUploads = path.join(process.cwd(), 'uploads');

  if (fs.existsSync(appsBackendUploads)) {
    uploadRoot = appsBackendUploads;
  } else if (fs.existsSync(path.join(process.cwd(), 'apps', 'backend'))) {
    // We are in root, but uploads folder might not exist yet. Default to apps/backend/uploads
    uploadRoot = appsBackendUploads;
  } else {
    // We are likely in apps/backend or elsewhere
    uploadRoot = localUploads;
  }
}

console.log(`[Config] UPLOAD_ROOT resolved to: ${uploadRoot}`);
console.log(`[Config] CWD: ${process.cwd()}`);

export const UPLOAD_ROOT = uploadRoot;
