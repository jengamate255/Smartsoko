#!/usr/bin/env node
/**
 * Firestore Backup Script
 * Run via cron: 0 2 * * * /usr/bin/node /path/to/backup-firestore.js
 * 
 * Prerequisites:
 * - gcloud CLI installed and authenticated
 * - Firebase project with Firestore enabled
 * - Service account with datastore.importExportAdmin role
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'fooddelievry-dce15',
  bucket: process.env.FIRESTORE_BACKUP_BUCKET || 'smartsoko-firestore-backups',
  collections: ['users', 'orders', 'products', 'sellers', 'riders', 'categories', 'addresses', 'payments', 'notifications'],
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
  gcloudPath: process.env.GCLOUD_PATH || 'gcloud',
};

const LOG_PREFIX = '[Firestore Backup]';

function log(level, msg) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${LOG_PREFIX} [${level}] ${msg}`);
}

function runCmd(cmd, options = {}) {
  log('DEBUG', `Running: ${cmd}`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...options });
    return { success: true, output: output.trim() };
  } catch (e) {
    return { success: false, error: e.message, stderr: e.stderr?.toString() };
  }
}

async function exportFirestore() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `gs://${CONFIG.bucket}/${CONFIG.projectId}-${timestamp}`;
  
  log('INFO', `Starting Firestore export to ${outputPath}`);
  
  const collectionsArg = CONFIG.collections.map(c => `--collection-ids=${c}`).join(' ');
  const cmd = `${CONFIG.gcloudPath} firestore export ${outputPath} ${collectionsArg} --project=${CONFIG.projectId} --async`;
  
  const result = runCmd(cmd);
  if (!result.success) {
    log('ERROR', `Export failed: ${result.error}`);
    if (result.stderr) log('ERROR', result.stderr);
    throw new Error('Firestore export command failed');
  }
  
  log('INFO', `Export operation started: ${result.output}`);
  
  // Parse operation name from output
  const opMatch = result.output.match(/operations\/([^\s]+)/);
  return opMatch ? opMatch[1] : null;
}

async function waitForOperation(operationName, maxWaitMs = 3600000) {
  if (!operationName) return true;
  
  log('INFO', `Waiting for operation ${operationName} to complete...`);
  const startTime = Date.now();
  const pollInterval = 30000; // 30 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    const cmd = `${CONFIG.gcloudPath} firestore operations describe ${operationName} --project=${CONFIG.projectId} --format='value(done,metadata.endTime)'`;
    const result = runCmd(cmd);
    
    if (!result.success) {
      log('WARN', `Failed to check operation status: ${result.error}`);
      await sleep(pollInterval);
      continue;
    }
    
    const [done, endTime] = result.output.split('\t');
    if (done === 'True') {
      log('INFO', `Operation completed at ${endTime}`);
      return true;
    }
    
    log('DEBUG', 'Operation still running...');
    await sleep(pollInterval);
  }
  
  log('ERROR', `Operation timed out after ${maxWaitMs/1000/60} minutes`);
  return false;
}

async function cleanupOldBackups() {
  log('INFO', `Cleaning up backups older than ${CONFIG.retentionDays} days...`);
  
  const cmd = `${CONFIG.gcloudPath} storage ls gs://${CONFIG.bucket}/ --format='value(name,time_created)' --project=${CONFIG.projectId}`;
  const result = runCmd(cmd);
  
  if (!result.success) {
    log('WARN', `Failed to list backups: ${result.error}`);
    return;
  }
  
  const lines = result.output.trim().split('\n');
  const cutoff = Date.now() - (CONFIG.retentionDays * 24 * 60 * 60 * 1000);
  let deleted = 0;
  
  for (const line of lines) {
    const [name, timeStr] = line.split('\t');
    if (!name || !timeStr) continue;
    
    const created = new Date(timeStr).getTime();
    if (created < cutoff) {
      log('INFO', `Deleting old backup: ${name}`);
      const delCmd = `${CONFIG.gcloudPath} storage rm -r ${name} --project=${CONFIG.projectId}`;
      const delResult = runCmd(delCmd);
      if (delResult.success) deleted++;
    }
  }
  
  log('INFO', `Cleanup complete: ${deleted} old backups removed`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('INFO', '═══ Firestore Backup Started ═══');
  log('INFO', `Project: ${CONFIG.projectId}`);
  log('INFO', `Bucket: ${CONFIG.bucket}`);
  log('INFO', `Collections: ${CONFIG.collections.join(', ')}`);
  log('INFO', `Retention: ${CONFIG.retentionDays} days`);
  
  try {
    // Step 1: Export
    const operationName = await exportFirestore();
    
    // Step 2: Wait for completion
    const completed = await waitForOperation(operationName);
    if (!completed) {
      log('ERROR', 'Export operation did not complete successfully');
      process.exit(1);
    }
    
    // Step 3: Cleanup old backups
    await cleanupOldBackups();
    
    log('INFO', '═══ Firestore Backup Completed Successfully ═══');
    process.exit(0);
  } catch (e) {
    log('ERROR', `Backup failed: ${e.message}`);
    process.exit(1);
  }
}

main();