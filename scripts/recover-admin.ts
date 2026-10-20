import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Dynamic storage path resolution (matches server.ts)
function resolveStorage() {
  const configuredDir = process.env.DATA_DIR || process.env.RENDER_DISK_PATH;
  const repoDir = projectRoot;
  const defaultRepoDbFile = path.join(repoDir, '.billflow-db.json');

  let activeDir = repoDir;
  let isDiskMounted = false;

  if (configuredDir) {
    try {
      if (!fs.existsSync(configuredDir)) {
        fs.mkdirSync(configuredDir, { recursive: true });
      }
      const probeFile = path.join(configuredDir, `.probe-${Date.now()}`);
      fs.writeFileSync(probeFile, 'ok', 'utf8');
      fs.unlinkSync(probeFile);
      activeDir = configuredDir;
      isDiskMounted = true;
    } catch {
      activeDir = repoDir;
      isDiskMounted = false;
    }
  }

  const activeDbFile = path.join(activeDir, '.billflow-db.json');

  return {
    configuredDir: configuredDir || null,
    activeDir,
    activeDbFile,
    defaultRepoDbFile,
    isDiskMounted,
  };
}

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function run() {
  console.log('=====================================================');
  console.log('  BillFlow India — Super Admin Account Recovery Tool  ');
  console.log('=====================================================\n');

  const storage = resolveStorage();
  console.log('Storage Diagnostics:');
  console.log(`- Configured DATA_DIR: ${storage.configuredDir || '(not set, using project root)'}`);
  console.log(`- Active Data Directory: ${storage.activeDir}`);
  console.log(`- Active Database File: ${storage.activeDbFile}`);
  console.log(`- Database Exists: ${fs.existsSync(storage.activeDbFile) ? 'YES' : 'NO'}\n`);

  let dbPath = storage.activeDbFile;
  if (!fs.existsSync(dbPath)) {
    if (fs.existsSync(storage.defaultRepoDbFile)) {
      console.log(`Active file not found, falling back to: ${storage.defaultRepoDbFile}`);
      dbPath = storage.defaultRepoDbFile;
    } else {
      console.error('Error: No BillFlow database file found!');
      process.exit(1);
    }
  }

  const rawData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(rawData);

  if (!Array.isArray(db.users) || db.users.length === 0) {
    console.log('No users found in database. Initial setup is required via the web interface.');
    process.exit(0);
  }

  const superAdmins = db.users.filter((u: any) => u.role === 'super_admin');
  console.log(`Found ${db.users.length} total user(s), ${superAdmins.length} Super Admin(s):\n`);

  superAdmins.forEach((admin: any, idx: number) => {
    console.log(`[${idx + 1}] ID: ${admin.id}`);
    console.log(`    Name: ${admin.name}`);
    console.log(`    Email: ${admin.email}`);
    console.log(`    Status: ${admin.status}`);
    console.log(`    MFA Enabled: ${Boolean(admin.mfaEnabled)}`);
    console.log(`    Recovery Codes Available: ${Array.isArray(admin.recoveryCodes) ? admin.recoveryCodes.length : 0}`);
    if (Array.isArray(admin.recoveryCodes) && admin.recoveryCodes.length > 0) {
      console.log(`    Emergency Recovery Codes: ${admin.recoveryCodes.join(', ')}`);
    }
    console.log('');
  });

  // Parse arguments for reset
  const args = process.argv.slice(2);
  let newPassword = '';
  let targetEmail = '';
  let newEmail = '';

  args.forEach((arg) => {
    if (arg.startsWith('--password=')) newPassword = arg.split('=')[1];
    if (arg.startsWith('--email=')) targetEmail = arg.split('=')[1];
    if (arg.startsWith('--new-email=')) newEmail = arg.split('=')[1];
  });

  if (newPassword) {
    if (newPassword.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    let target = superAdmins[0];
    if (targetEmail) {
      target = superAdmins.find((u: any) => u.email.toLowerCase() === targetEmail.trim().toLowerCase());
      if (!target) {
        console.error(`Error: Super Admin with email "${targetEmail}" not found.`);
        process.exit(1);
      }
    }

    const { salt, hash } = hashPassword(newPassword);
    target.passwordSalt = salt;
    target.passwordHash = hash;
    target.updatedAt = new Date().toISOString();

    if (newEmail && newEmail.includes('@')) {
      console.log(`Updating Super Admin email from "${target.email}" to "${newEmail.trim().toLowerCase()}"`);
      target.email = newEmail.trim().toLowerCase();
    }

    // Invalidate old sessions
    db.sessions = (db.sessions || []).filter((s: any) => s.userId !== target.id);

    // Save back to dbPath
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

    // Also sync to activeDbFile if different
    if (dbPath !== storage.activeDbFile && storage.isDiskMounted) {
      try {
        fs.writeFileSync(storage.activeDbFile, JSON.stringify(db, null, 2), 'utf8');
      } catch {}
    }

    console.log('✅ Super Admin credentials updated successfully!');
    console.log(`   Email: ${target.email}`);
    console.log('   All customer records, invoices, products, and settings have been safely preserved.');
    console.log('   You can now sign in at http://localhost:3000/ or your deployed URL.\n');
  } else {
    console.log('Usage to reset password securely:');
    console.log('  npx tsx scripts/recover-admin.ts --password="YourNewPassword123"');
    console.log('  npx tsx scripts/recover-admin.ts --email="admin@test.com" --password="YourNewPassword123" --new-email="your.email@company.in"\n');
  }
}

run();
