import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Dynamic storage path resolution (matches server.ts exactly)
export function resolveStorage() {
  const configuredDir = process.env.DATA_DIR || process.env.RENDER_DISK_PATH;
  const repoDir = projectRoot;
  const defaultRepoDbFile = path.join(repoDir, '.billflow-db.json');

  let activeDir = repoDir;
  let isDiskMounted = false;
  let isWritable = false;

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
      isWritable = true;
    } catch {
      activeDir = repoDir;
      isDiskMounted = false;
      isWritable = false;
    }
  } else {
    isWritable = true;
  }

  const activeDbFile = path.join(activeDir, '.billflow-db.json');
  const activeBackupFile = path.join(activeDir, '.billflow-db.backup.json');

  return {
    configuredDir: configuredDir || null,
    activeDir,
    activeDbFile,
    defaultRepoDbFile,
    activeBackupFile,
    isDiskMounted,
    isWritable,
  };
}

// Cryptographically secure password hashing matching BillFlow server
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function generateRecoveryCodes(count: number = 4): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

function askQuestion(query: string, hidden: boolean = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(query);
      const stdin = process.stdin;
      let text = '';
      const onData = (char: Buffer) => {
        const c = char.toString();
        if (c === '\n' || c === '\r' || c === '\u0004') {
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(text);
        } else if (c === '\u0003') {
          process.exit(1);
        } else if (c === '\b' || c === '\x7f') {
          if (text.length > 0) {
            text = text.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          text += c;
          process.stdout.write('*');
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function run() {
  console.log('================================================================');
  console.log('  BillFlow India — Super Admin Bootstrap & Account Recovery Tool');
  console.log('================================================================\n');

  const storage = resolveStorage();
  console.log('Database & Storage Diagnostics:');
  console.log(`- Configured DATA_DIR: ${storage.configuredDir || '(not set, using project root)'}`);
  console.log(`- Active Data Directory: ${storage.activeDir}`);
  console.log(`- Active Database File: ${storage.activeDbFile}`);
  console.log(`- Database Exists on Active Path: ${fs.existsSync(storage.activeDbFile) ? 'YES' : 'NO'}`);
  console.log(`- Persistent Disk Mounted: ${storage.isDiskMounted ? 'YES' : 'NO'}\n`);

  let dbPath = storage.activeDbFile;
  if (!fs.existsSync(dbPath)) {
    if (fs.existsSync(storage.defaultRepoDbFile)) {
      console.log(`[STORAGE] Active file not found, copying from template: ${storage.defaultRepoDbFile}`);
      const template = fs.readFileSync(storage.defaultRepoDbFile, 'utf8');
      fs.writeFileSync(dbPath, template, 'utf8');
    } else {
      console.error('Error: No BillFlow database file found!');
      process.exit(1);
    }
  }

  const rawData = fs.readFileSync(dbPath, 'utf8');
  let db: any;
  try {
    db = JSON.parse(rawData);
  } catch (err: any) {
    console.error('Error: Database JSON is corrupt:', err?.message);
    process.exit(1);
  }

  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];

  const existingSuperAdmins = db.users.filter((u: any) => u.role === 'super_admin');
  console.log(`Current Database State:`);
  console.log(`- Total Users: ${db.users.length}`);
  console.log(`- Super Admins: ${existingSuperAdmins.length}`);
  existingSuperAdmins.forEach((admin: any, idx: number) => {
    console.log(`  [${idx + 1}] ${admin.name} <${admin.email}> (Status: ${admin.status})`);
  });
  console.log(`- Invoices: ${(db.invoices || []).length} | Customers: ${(db.customers || []).length} | Products: ${(db.products || []).length}\n`);

  // Parse options: Environment variables > CLI args > Interactive prompts
  const args = process.argv.slice(2);
  let adminEmail =
    process.env.ADMIN_EMAIL ||
    process.env.BOOTSTRAP_ADMIN_EMAIL ||
    '';
  let adminPassword =
    process.env.ADMIN_PASSWORD ||
    process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    '';
  let adminName =
    process.env.ADMIN_NAME ||
    process.env.BOOTSTRAP_ADMIN_NAME ||
    '';
  let isForce = process.env.BOOTSTRAP_FORCE === 'true';

  args.forEach((arg) => {
    if (arg.startsWith('--email=')) adminEmail = arg.split('=')[1].trim();
    if (arg.startsWith('--password=')) adminPassword = arg.split('=')[1];
    if (arg.startsWith('--name=')) adminName = arg.split('=')[1].trim();
    if (arg === '--force') isForce = true;
    if (arg === '--help' || arg === '-h') {
      console.log('Usage:');
      console.log('  1. Environment variables (RECOMMENDED for Render / Production):');
      console.log('     ADMIN_EMAIL="admin@company.in" ADMIN_PASSWORD="SafePassword123" npx tsx scripts/recover-admin.ts\n');
      console.log('  2. Interactive prompt (run in Render Shell or terminal):');
      console.log('     npx tsx scripts/recover-admin.ts\n');
      console.log('  3. Command-line flags:');
      console.log('     npx tsx scripts/recover-admin.ts --email="admin@company.in" --password="SafePassword123" [--name="Full Name"] [--force]\n');
      process.exit(0);
    }
  });

  // If email or password is missing and stdin is interactive, prompt operator
  if (!adminEmail) {
    if (process.stdin.isTTY) {
      adminEmail = await askQuestion('Enter Administrator Email Address: ');
    } else {
      console.error('Error: Administrator email is required. Set ADMIN_EMAIL env var or pass --email=...');
      process.exit(1);
    }
  }

  adminEmail = adminEmail.trim().toLowerCase();
  if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
    console.error(`Error: "${adminEmail}" is not a valid email address.`);
    process.exit(1);
  }

  if (!adminPassword) {
    if (process.stdin.isTTY) {
      adminPassword = await askQuestion('Enter New Administrator Password (min 8 characters): ', true);
      const confirmPass = await askQuestion('Confirm Administrator Password: ', true);
      if (adminPassword !== confirmPass) {
        console.error('Error: Passwords do not match.');
        process.exit(1);
      }
    } else {
      console.error('Error: Administrator password is required. Set ADMIN_PASSWORD env var or pass --password=...');
      process.exit(1);
    }
  }

  if (adminPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  // Check if target user already exists
  const existingUserIndex = db.users.findIndex(
    (u: any) => u.email.toLowerCase() === adminEmail
  );

  const { salt, hash } = hashPassword(adminPassword);
  const recoveryCodes = generateRecoveryCodes(4);

  let targetAdmin: any = null;

  if (existingUserIndex >= 0) {
    // Scenario A: User already exists - perform secure recovery and elevation
    targetAdmin = db.users[existingUserIndex];
    console.log(`\nFound existing account for "${adminEmail}" (current role: ${targetAdmin.role}).`);
    console.log(`Updating password, assigning Super Admin role, and generating fresh recovery codes...`);

    targetAdmin.role = 'super_admin';
    targetAdmin.status = 'active';
    targetAdmin.passwordSalt = salt;
    targetAdmin.passwordHash = hash;
    targetAdmin.recoveryCodes = recoveryCodes;
    targetAdmin.updatedAt = new Date().toISOString();
    if (adminName) targetAdmin.name = adminName;

    // Invalidate all existing sessions for this user for security
    db.sessions = db.sessions.filter((s: any) => s.userId !== targetAdmin.id);

    db.auditLogs.unshift({
      id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: targetAdmin.id,
      userName: targetAdmin.name,
      userRole: 'super_admin',
      action: 'SUPER_ADMIN_PASSWORD_RECOVERED_CLI',
      entityType: 'auth',
      entityId: targetAdmin.id,
      details: `Super Admin account recovered & password updated via CLI bootstrap tool for: ${adminEmail}`,
      ip: '127.0.0.1 (CLI)',
    });
  } else {
    // Scenario B: Target user does NOT exist
    const isOnlyPlaceholder =
      existingSuperAdmins.length === 1 &&
      (existingSuperAdmins[0].email === 'admin@test.com' ||
        existingSuperAdmins[0].email.includes('test'));

    if (existingSuperAdmins.length === 0 || isOnlyPlaceholder) {
      if (isOnlyPlaceholder) {
        console.log(`\nNotice: Removing dummy placeholder account (${existingSuperAdmins[0].email}).`);
        db.users = db.users.filter((u: any) => u.id !== existingSuperAdmins[0].id);
        db.sessions = db.sessions.filter((s: any) => s.userId !== existingSuperAdmins[0].id);
      } else {
        console.log('\nNo Super Admin currently configured.');
      }

      const displayName =
        adminName ||
        (adminEmail.split('@')[0].charAt(0).toUpperCase() + adminEmail.split('@')[0].slice(1));

      targetAdmin = {
        id: `usr-${Date.now()}`,
        name: displayName,
        email: adminEmail,
        role: 'super_admin',
        status: 'active',
        passwordSalt: salt,
        passwordHash: hash,
        mfaEnabled: false,
        mfaSecret: crypto.randomBytes(20).toString('hex'),
        recoveryCodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.users.push(targetAdmin);

      db.auditLogs.unshift({
        id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        userId: targetAdmin.id,
        userName: targetAdmin.name,
        userRole: 'super_admin',
        action: 'SUPER_ADMIN_BOOTSTRAP_CREATED_CLI',
        entityType: 'auth',
        entityId: targetAdmin.id,
        details: `Initial Super Admin account created via CLI bootstrap tool for: ${adminEmail}`,
        ip: '127.0.0.1 (CLI)',
      });
    } else {
      // Existing real Super Admins exist
      if (!isForce) {
        console.error(
          `\nSecurity Refusal: System already has ${existingSuperAdmins.length} active Super Admin(s):`
        );
        existingSuperAdmins.forEach((a: any) => console.error(`  - ${a.email} (${a.name})`));
        console.error(
          `To add or replace an authorized administrator, re-run with --force or set BOOTSTRAP_FORCE=true.`
        );
        process.exit(1);
      }

      const displayName =
        adminName ||
        (adminEmail.split('@')[0].charAt(0).toUpperCase() + adminEmail.split('@')[0].slice(1));

      targetAdmin = {
        id: `usr-${Date.now()}`,
        name: displayName,
        email: adminEmail,
        role: 'super_admin',
        status: 'active',
        passwordSalt: salt,
        passwordHash: hash,
        mfaEnabled: false,
        mfaSecret: crypto.randomBytes(20).toString('hex'),
        recoveryCodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.users.push(targetAdmin);
      console.log(`--force specified: Created additional Super Admin account for ${adminEmail}.`);
    }
  }

  // Atomic write to active database file
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

  // Also sync to activeDbFile if dbPath was repository fallback and disk is mounted
  if (dbPath !== storage.activeDbFile && storage.isDiskMounted) {
    try {
      fs.writeFileSync(storage.activeDbFile, JSON.stringify(db, null, 2), 'utf8');
    } catch {}
  }

  // Backup snapshot
  try {
    fs.writeFileSync(storage.activeBackupFile, JSON.stringify(db, null, 2), 'utf8');
  } catch {}

  console.log('\n================================================================');
  console.log('✅ SUPER ADMIN BOOTSTRAP & RECOVERY COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');
  console.log(`Administrator Email: ${targetAdmin.email}`);
  console.log(`Administrator Name:  ${targetAdmin.name}`);
  console.log(`Role:                SUPER ADMIN (Full Permissions)`);
  console.log(`Status:              ACTIVE\n`);
  console.log('EMERGENCY ONE-TIME RECOVERY CODES:');
  console.log('Keep these codes in a secure offline password vault.');
  console.log('You can use any of these codes to regain access via the web UI at /api/auth/recover-admin:\n');
  recoveryCodes.forEach((code, idx) => {
    console.log(`  Code ${idx + 1}: ${code}`);
  });
  console.log('\nDatabase Protection Status:');
  console.log(`- All ${(db.invoices || []).length} invoices, ${(db.customers || []).length} customers, ${(db.products || []).length} products, and settings were preserved.`);
  console.log(`- Database persisted to: ${dbPath}`);
  console.log('\nYou can now log in at your web application URL with:');
  console.log(`  Email:    ${targetAdmin.email}`);
  console.log('  Password: [The password you configured]\n');
}

run().catch((err) => {
  console.error('\n❌ Fatal error during recovery:', err);
  process.exit(1);
});
