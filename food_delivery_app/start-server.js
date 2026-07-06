const { startRealtimeServer } = require('./server-production');

console.log('🚀 Starting SmartSoko Server...');

try {
  const server = startRealtimeServer();
  console.log('✅ Server started successfully');

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}